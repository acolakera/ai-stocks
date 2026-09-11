import {
  buildDerivedMetrics
} from "./metrics.js";

import {
  generateFundamentalAnalysis
} from "./analysis.js";


const SEC_TICKERS_URL =
  "https://www.sec.gov/files/company_tickers_exchange.json";

const SEC_COMPANY_FACTS_URL =
  "https://data.sec.gov/api/xbrl/companyfacts";

const TICKER_PATTERN =
  /^[A-Z0-9.-]{1,12}$/;


/*
  AI analysis is intentionally limited
  during the research preview.
*/

const AI_PREVIEW_TICKERS =
  new Set([
    "AAPL",
    "NVDA",
    "MSFT",
    "GOOGL",
    "AMZN"
  ]);


/*
  Increment this value whenever the
  AI methodology or prompt changes.
*/

const ANALYSIS_CACHE_VERSION =
  "v4";

const ANALYSIS_CACHE_TTL =
  86400;


/* =========================================
   RESPONSE HELPERS
   ========================================= */

function jsonResponse(
  data,
  status = 200,
  cacheControl = "no-store"
) {
  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          cacheControl,

        "X-Content-Type-Options":
          "nosniff"
      }
    }
  );
}


/* =========================================
   BASIC HELPERS
   ========================================= */

function normalizeTicker(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}


function isAnnualForm(form) {
  return (
    form === "10-K" ||
    form === "10-K/A"
  );
}


/* =========================================
   SEC REQUESTS
   ========================================= */

async function fetchSecJson(
  url,
  env,
  cacheTtl
) {
  const userAgent =
    env.SEC_USER_AGENT?.trim();


  if (!userAgent) {
    throw new Error(
      "SEC_USER_AGENT_NOT_CONFIGURED"
    );
  }


  const response =
    await fetch(
      url,
      {
        headers: {
          "User-Agent":
            userAgent,

          "Accept":
            "application/json",

          "Accept-Encoding":
            "gzip, deflate"
        },

        cf: {
          cacheEverything: true,
          cacheTtl
        }
      }
    );


  if (!response.ok) {
    throw new Error(
      `SEC_REQUEST_FAILED_${response.status}`
    );
  }


  return response.json();
}


/* =========================================
   COMPANY LOOKUP
   ========================================= */

async function findSecCompany(
  symbol,
  env
) {
  const payload =
    await fetchSecJson(
      SEC_TICKERS_URL,
      env,
      86400
    );


  const fields =
    Array.isArray(payload.fields)
      ? payload.fields
      : [];

  const rows =
    Array.isArray(payload.data)
      ? payload.data
      : [];


  const cikIndex =
    fields.indexOf("cik");

  const nameIndex =
    fields.indexOf("name");

  const tickerIndex =
    fields.indexOf("ticker");

  const exchangeIndex =
    fields.indexOf("exchange");


  if (
    cikIndex === -1 ||
    nameIndex === -1 ||
    tickerIndex === -1
  ) {
    throw new Error(
      "SEC_TICKER_FORMAT_UNEXPECTED"
    );
  }


  const row =
    rows.find((item) => {
      return (
        normalizeTicker(
          item[tickerIndex]
        ) === symbol
      );
    });


  if (!row) {
    return null;
  }


  return {
    symbol:
      normalizeTicker(
        row[tickerIndex]
      ),

    name:
      String(
        row[nameIndex] ?? ""
      ),

    cik:
      String(
        row[cikIndex]
      ).padStart(10, "0"),

    exchange:
      exchangeIndex === -1
        ? null
        : (
            row[exchangeIndex] ??
            null
          ),

    source:
      "SEC EDGAR"
  };
}


/* =========================================
   COMPANY FACTS
   ========================================= */

async function fetchCompanyFacts(
  cik,
  env
) {
  const url =
    `${SEC_COMPANY_FACTS_URL}/CIK${cik}.json`;


  return fetchSecJson(
    url,
    env,
    21600
  );
}


/* =========================================
   XBRL HELPERS
   ========================================= */

function getConcept(
  companyFacts,
  conceptName
) {
  return (
    companyFacts
      ?.facts
      ?.["us-gaap"]
      ?.[conceptName] ??
    null
  );
}


function getFactsFromUnits(
  concept,
  preferredUnits
) {
  const units =
    concept?.units;


  if (!units) {
    return {
      unit: null,
      facts: []
    };
  }


  for (
    const preferredUnit
    of preferredUnits
  ) {
    if (
      Array.isArray(
        units[preferredUnit]
      )
    ) {
      return {
        unit:
          preferredUnit,

        facts:
          units[preferredUnit]
      };
    }
  }


  const fallbackUnit =
    Object.keys(units)[0];


  if (!fallbackUnit) {
    return {
      unit: null,
      facts: []
    };
  }


  return {
    unit:
      fallbackUnit,

    facts:
      Array.isArray(
        units[fallbackUnit]
      )
        ? units[fallbackUnit]
        : []
  };
}


function normalizeFact(
  fact,
  concept,
  unit
) {
  if (!fact) {
    return null;
  }


  return {
    value:
      fact.val ?? null,

    unit,

    concept,

    start:
      fact.start ?? null,

    end:
      fact.end ?? null,

    fiscalYear:
      fact.end
        ? Number(
            String(fact.end)
              .slice(0, 4)
          )
        : null,

    reportedFiscalYear:
      fact.fy ?? null,

    fiscalPeriod:
      fact.fp ?? null,

    form:
      fact.form ?? null,

    filed:
      fact.filed ?? null,

    accessionNumber:
      fact.accn ?? null
  };
}


/* =========================================
   ANNUAL PERIOD DISCOVERY
   ========================================= */

function findAnnualFacts(
  companyFacts,
  conceptNames,
  preferredUnits
) {
  const candidates = [];


  conceptNames.forEach(
    (
      conceptName,
      conceptPriority
    ) => {
      const concept =
        getConcept(
          companyFacts,
          conceptName
        );


      if (!concept) {
        return;
      }


      const {
        unit,
        facts
      } =
        getFactsFromUnits(
          concept,
          preferredUnits
        );


      facts.forEach(
        (fact) => {
          if (
            !isAnnualForm(
              fact.form
            ) ||
            fact.fp !== "FY" ||
            !fact.end
          ) {
            return;
          }


          candidates.push({
            fact,
            conceptName,
            conceptPriority,
            unit
          });
        }
      );
    }
  );


  candidates.sort(
    (a, b) => {
      const endDifference =
        String(
          b.fact.end ?? ""
        ).localeCompare(
          String(
            a.fact.end ?? ""
          )
        );


      if (
        endDifference !== 0
      ) {
        return endDifference;
      }


      const filedDifference =
        String(
          b.fact.filed ?? ""
        ).localeCompare(
          String(
            a.fact.filed ?? ""
          )
        );


      if (
        filedDifference !== 0
      ) {
        return filedDifference;
      }


      if (
        a.conceptPriority !==
        b.conceptPriority
      ) {
        return (
          a.conceptPriority -
          b.conceptPriority
        );
      }


      return String(
        b.fact.accn ?? ""
      ).localeCompare(
        String(
          a.fact.accn ?? ""
        )
      );
    }
  );


  const uniquePeriods =
    new Map();


  candidates.forEach(
    (candidate) => {
      const periodEnd =
        candidate.fact.end;


      if (
        uniquePeriods.has(
          periodEnd
        )
      ) {
        return;
      }


      uniquePeriods.set(
        periodEnd,

        normalizeFact(
          candidate.fact,
          candidate.conceptName,
          candidate.unit
        )
      );
    }
  );


  return Array.from(
    uniquePeriods.values()
  );
}


/* =========================================
   FACT FOR SPECIFIC ANNUAL PERIOD
   ========================================= */

function findFactForAnnualPeriod(
  companyFacts,
  conceptNames,
  preferredUnits,
  periodEnd
) {
  if (!periodEnd) {
    return null;
  }


  const candidates = [];


  conceptNames.forEach(
    (
      conceptName,
      conceptPriority
    ) => {
      const concept =
        getConcept(
          companyFacts,
          conceptName
        );


      if (!concept) {
        return;
      }


      const {
        unit,
        facts
      } =
        getFactsFromUnits(
          concept,
          preferredUnits
        );


      facts.forEach(
        (fact) => {
          if (
            !isAnnualForm(
              fact.form
            ) ||
            fact.end !==
              periodEnd
          ) {
            return;
          }


          candidates.push({
            fact,
            conceptName,
            conceptPriority,
            unit
          });
        }
      );
    }
  );


  candidates.sort(
    (a, b) => {
      const filedDifference =
        String(
          b.fact.filed ?? ""
        ).localeCompare(
          String(
            a.fact.filed ?? ""
          )
        );


      if (
        filedDifference !== 0
      ) {
        return filedDifference;
      }


      if (
        a.conceptPriority !==
        b.conceptPriority
      ) {
        return (
          a.conceptPriority -
          b.conceptPriority
        );
      }


      return String(
        b.fact.accn ?? ""
      ).localeCompare(
        String(
          a.fact.accn ?? ""
        )
      );
    }
  );


  if (
    candidates.length === 0
  ) {
    return null;
  }


  const selected =
    candidates[0];


  return normalizeFact(
    selected.fact,
    selected.conceptName,
    selected.unit
  );
}


/* =========================================
   BUILD ONE ANNUAL PERIOD
   ========================================= */

function buildAnnualPeriod(
  companyFacts,
  revenueFact
) {
  if (!revenueFact) {
    return null;
  }


  const periodEnd =
    revenueFact.end;


  const netIncome =
    findFactForAnnualPeriod(
      companyFacts,
      ["NetIncomeLoss"],
      ["USD"],
      periodEnd
    );


  const dilutedEPS =
    findFactForAnnualPeriod(
      companyFacts,
      ["EarningsPerShareDiluted"],
      ["USD/shares"],
      periodEnd
    );


  const assets =
    findFactForAnnualPeriod(
      companyFacts,
      ["Assets"],
      ["USD"],
      periodEnd
    );


  const liabilities =
    findFactForAnnualPeriod(
      companyFacts,

      [
        "Liabilities"
      ],

      ["USD"],

      periodEnd
    );


  const equity =
    findFactForAnnualPeriod(
      companyFacts,

      [
        "StockholdersEquity",
        "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"
      ],

      ["USD"],

      periodEnd
    );


  const cash =
    findFactForAnnualPeriod(
      companyFacts,

      [
        "CashAndCashEquivalentsAtCarryingValue",
        "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"
      ],

      ["USD"],

      periodEnd
    );


  const operatingCashFlow =
    findFactForAnnualPeriod(
      companyFacts,

      [
        "NetCashProvidedByUsedInOperatingActivities"
      ],

      ["USD"],

      periodEnd
    );


  const capitalExpenditures =
    findFactForAnnualPeriod(
      companyFacts,

      [
        "PaymentsToAcquirePropertyPlantAndEquipment",
        "PaymentsToAcquireProductiveAssets"
      ],

      ["USD"],

      periodEnd
    );


  let freeCashFlow =
    null;


  const operatingCashFlowValue =
    operatingCashFlow?.value;

  const capitalExpenditureValue =
    capitalExpenditures?.value;


  if (
    operatingCashFlowValue !== null &&
    operatingCashFlowValue !== undefined &&
    capitalExpenditureValue !== null &&
    capitalExpenditureValue !== undefined
  ) {
    const operatingCashFlowNumber =
      Number(
        operatingCashFlowValue
      );

    const capitalExpenditureNumber =
      Number(
        capitalExpenditureValue
      );


    if (
      Number.isFinite(
        operatingCashFlowNumber
      ) &&
      Number.isFinite(
        capitalExpenditureNumber
      )
    ) {
      freeCashFlow = {
        value:
          operatingCashFlowNumber -
          Math.abs(
            capitalExpenditureNumber
          ),

        unit:
          "USD",

        derived:
          true,

        formula:
          "Operating Cash Flow - Capital Expenditures",

        end:
          periodEnd
      };
    }
  }


  return {
    fiscalYear:
      revenueFact.fiscalYear,

    periodEnd,

    filed:
      revenueFact.filed,

    form:
      revenueFact.form,

    revenue:
      revenueFact,

    netIncome,

    dilutedEPS,

    assets,

    liabilities,

    equity,

    cash,

    operatingCashFlow,

    capitalExpenditures,

    freeCashFlow
  };
}


/* =========================================
   BUILD FUNDAMENTALS
   ========================================= */

function buildFundamentals(
  companyFacts
) {
  const revenueFacts =
    findAnnualFacts(
      companyFacts,

      [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet"
      ],

      ["USD"]
    );


  if (
    revenueFacts.length === 0
  ) {
    return null;
  }


  const current =
    buildAnnualPeriod(
      companyFacts,
      revenueFacts[0]
    );


  const previous =
    revenueFacts.length > 1
      ? buildAnnualPeriod(
          companyFacts,
          revenueFacts[1]
        )
      : null;


  const derived =
    buildDerivedMetrics(
      current,
      previous
    );


  return {
    current,
    previous,
    derived
  };
}


/* =========================================
   SYMBOL VALIDATION
   ========================================= */

function getRequestedSymbol(
  request
) {
  const url =
    new URL(request.url);


  return normalizeTicker(
    url.searchParams.get(
      "symbol"
    )
  );
}


function validateSymbol(
  symbol
) {
  if (!symbol) {
    return {
      valid: false,

      error:
        "A ticker symbol is required."
    };
  }


  if (
    !TICKER_PATTERN.test(
      symbol
    )
  ) {
    return {
      valid: false,

      error:
        "Invalid ticker symbol."
    };
  }


  return {
    valid: true
  };
}


/* =========================================
   LOAD COMPANY FUNDAMENTALS
   ========================================= */

async function loadCompanyFundamentals(
  symbol,
  env
) {
  const company =
    await findSecCompany(
      symbol,
      env
    );


  if (!company) {
    return {
      company: null,
      fundamentals: null
    };
  }


  const companyFacts =
    await fetchCompanyFacts(
      company.cik,
      env
    );


  const fundamentals =
    buildFundamentals(
      companyFacts
    );


  return {
    company,
    fundamentals
  };
}


/* =========================================
   ROUTE: COMPANY
   ========================================= */

async function handleCompanyLookup(
  request,
  env
) {
  const symbol =
    getRequestedSymbol(
      request
    );


  const validation =
    validateSymbol(
      symbol
    );


  if (!validation.valid) {
    return jsonResponse(
      {
        error:
          validation.error
      },
      400
    );
  }


  const company =
    await findSecCompany(
      symbol,
      env
    );


  if (!company) {
    return jsonResponse(
      {
        error:
          "Company not found."
      },
      404
    );
  }


  return jsonResponse(
    {
      ok: true,
      company
    },
    200,
    "public, max-age=3600"
  );
}


/* =========================================
   ROUTE: FUNDAMENTALS
   ========================================= */

async function handleFundamentals(
  request,
  env
) {
  const symbol =
    getRequestedSymbol(
      request
    );


  const validation =
    validateSymbol(
      symbol
    );


  if (!validation.valid) {
    return jsonResponse(
      {
        error:
          validation.error
      },
      400
    );
  }


  const {
    company,
    fundamentals
  } =
    await loadCompanyFundamentals(
      symbol,
      env
    );


  if (!company) {
    return jsonResponse(
      {
        error:
          "Company not found."
      },
      404
    );
  }


  if (
    !fundamentals?.current
  ) {
    return jsonResponse(
      {
        error:
          "Annual financial data is unavailable for this company."
      },
      404
    );
  }


  return jsonResponse(
    {
      ok: true,

      company,

      fundamentals,

      source: {
        provider:
          "SEC EDGAR",

        dataset:
          "Company Facts",

        type:
          "Reported financial statements",

        derivedMetrics:
          "Calculated from reported SEC figures"
      }
    },
    200,
    "public, max-age=21600"
  );
}


/* =========================================
   ANALYSIS CACHE
   ========================================= */

function buildAnalysisCacheKey(
  symbol,
  fundamentals
) {
  const periodEnd =
    fundamentals
      ?.current
      ?.periodEnd ??
    "unknown";


  const filed =
    fundamentals
      ?.current
      ?.filed ??
    "unknown";


  return [
    "analysis",
    ANALYSIS_CACHE_VERSION,
    symbol,
    periodEnd,
    filed
  ].join(":");
}


/* =========================================
   ROUTE: AI ANALYSIS
   ========================================= */

async function handleAnalysis(
  request,
  env
) {
  const symbol =
    getRequestedSymbol(
      request
    );


  const validation =
    validateSymbol(
      symbol
    );


  if (!validation.valid) {
    return jsonResponse(
      {
        error:
          validation.error
      },
      400
    );
  }


  if (
    !AI_PREVIEW_TICKERS.has(
      symbol
    )
  ) {
    return jsonResponse(
      {
        error:
          "AI research is currently limited to preview tickers."
      },
      404
    );
  }


  const {
    company,
    fundamentals
  } =
    await loadCompanyFundamentals(
      symbol,
      env
    );


  if (!company) {
    return jsonResponse(
      {
        error:
          "Company not found."
      },
      404
    );
  }


  if (
    !fundamentals?.current
  ) {
    return jsonResponse(
      {
        error:
          "Annual financial data is unavailable for this company."
      },
      404
    );
  }


  /*
    The KV cache key includes the analysis
    methodology version, ticker, annual
    reporting period and SEC filing date.

    A methodology change or a new annual
    filing therefore produces a new key.
  */

  if (!env.ANALYSIS_CACHE) {
    console.error(
      "ANALYSIS_CACHE KV binding is not configured."
    );


    return jsonResponse(
      {
        error:
          "AI research cache is not configured."
      },
      503
    );
  }


  const cacheKey =
    buildAnalysisCacheKey(
      symbol,
      fundamentals
    );


  let cachedPayload = null;


  try {
    cachedPayload =
      await env.ANALYSIS_CACHE.get(
        cacheKey,
        {
          type:
            "json"
        }
      );
  }

  catch (error) {
    console.error(
      "Analysis KV cache read failed:",
      error?.message ??
      error
    );


    /*
      Fail closed before calling OpenAI.

      This prevents a cache outage from
      turning into uncontrolled API spend.
    */

    return jsonResponse(
      {
        error:
          "AI research cache is temporarily unavailable."
      },
      503
    );
  }


  if (cachedPayload) {
    return jsonResponse(
      cachedPayload,
      200,
      `public, max-age=${ANALYSIS_CACHE_TTL}`
    );
  }


  let generated;


  try {
    generated =
      await generateFundamentalAnalysis(
        company,
        fundamentals,
        env
      );
  }

  catch (error) {
    console.error(
      "AI analysis failed:",
      error?.message ??
      error
    );


    if (
      error?.message ===
      "OPENAI_API_KEY_NOT_CONFIGURED"
    ) {
      return jsonResponse(
        {
          error:
            "AI research service is not configured."
        },
        503
      );
    }


    if (
      error?.message ===
      "OPENAI_REQUEST_TIMEOUT"
    ) {
      return jsonResponse(
        {
          error:
            "AI research request timed out."
        },
        504
      );
    }


    if (
      String(
        error?.message ?? ""
      ).includes(
        "OPENAI_REQUEST_FAILED_429"
      )
    ) {
      return jsonResponse(
        {
          error:
            "AI research service is temporarily unavailable."
        },
        503
      );
    }


    return jsonResponse(
      {
        error:
          "Unable to generate AI research."
      },
      502
    );
  }


  /*
    OpenAI's internal response ID is not
    exposed to the public frontend.
  */

  const publicMeta = {
    model:
      generated?.meta?.model ??
      null,

    generatedAt:
      generated?.meta?.generatedAt ??
      null,

    fiscalYear:
      generated?.meta?.fiscalYear ??
      null,

    periodEnd:
      generated?.meta?.periodEnd ??
      null,

    source:
      generated?.meta?.source ??
      "SEC EDGAR annual fundamentals",

    methodology:
      "Deterministic fundamental scoring with AI-generated narrative based only on supplied SEC annual financial data"
  };


  const responsePayload = {
    ok: true,

    company: {
      symbol:
        company.symbol,

      name:
        company.name,

      exchange:
        company.exchange,

      source:
        company.source
    },

    analysis:
  generated.analysis,

scoring:
  generated.scoring,

meta:
  publicMeta,

    disclaimer:
      "Informational research only. Not investment advice."
  };


  /*
    Persist the public response in Workers KV
    for 24 hours.

    The write is awaited so that once this
    request completes, the generated analysis
    has been stored whenever KV is healthy.
  */

  try {
    await env.ANALYSIS_CACHE.put(
      cacheKey,
      JSON.stringify(
        responsePayload
      ),
      {
        expirationTtl:
          ANALYSIS_CACHE_TTL
      }
    );
  }

  catch (error) {
    console.error(
      "Analysis KV cache write failed:",
      error?.message ??
      error
    );
  }


  return jsonResponse(
    responsePayload,
    200,
    `public, max-age=${ANALYSIS_CACHE_TTL}`
  );
}


/* =========================================
   WORKER
   ========================================= */

export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    const url =
      new URL(request.url);


    if (
      request.method !== "GET"
    ) {
      return jsonResponse(
        {
          error:
            "Method not allowed."
        },
        405
      );
    }


    try {
      if (
        url.pathname ===
        "/api/health"
      ) {
        return jsonResponse(
          {
            ok: true,

            service:
              "ai-stocks-api"
          }
        );
      }


      if (
        url.pathname ===
        "/api/company"
      ) {
        return await handleCompanyLookup(
          request,
          env
        );
      }


      if (
        url.pathname ===
        "/api/fundamentals"
      ) {
        return await handleFundamentals(
          request,
          env
        );
      }


      if (
        url.pathname ===
        "/api/analysis"
      ) {
        return await handleAnalysis(
          request,
          env
        );
      }


      return jsonResponse(
        {
          error:
            "API route not found."
        },
        404
      );
    }

    catch (error) {
      console.error(
        "API error:",
        error
      );


      if (
        error?.message ===
        "SEC_USER_AGENT_NOT_CONFIGURED"
      ) {
        return jsonResponse(
          {
            error:
              "SEC data source is not configured."
          },
          503
        );
      }


      return jsonResponse(
        {
          error:
            "Unable to retrieve financial data."
        },
        502
      );
    }
  }
};
