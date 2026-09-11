import {
  buildDerivedMetrics
} from "./metrics.js";


const SEC_TICKERS_URL =
  "https://www.sec.gov/files/company_tickers_exchange.json";

const SEC_COMPANY_FACTS_URL =
  "https://data.sec.gov/api/xbrl/companyfacts";

const TICKER_PATTERN =
  /^[A-Z0-9.-]{1,12}$/;


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


function compareFactsNewestFirst(
  a,
  b
) {
  const endDifference =
    String(b.end ?? "")
      .localeCompare(
        String(a.end ?? "")
      );

  if (endDifference !== 0) {
    return endDifference;
  }

  return String(b.filed ?? "")
    .localeCompare(
      String(a.filed ?? "")
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
        unit: preferredUnit,
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


      facts.forEach((fact) => {
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
      });
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

      if (endDifference !== 0) {
        return endDifference;
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
        b.fact.filed ?? ""
      ).localeCompare(
        String(
          a.fact.filed ?? ""
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


  for (
    const conceptName
    of conceptNames
  ) {
    const concept =
      getConcept(
        companyFacts,
        conceptName
      );

    if (!concept) {
      continue;
    }


    const {
      unit,
      facts
    } =
      getFactsFromUnits(
        concept,
        preferredUnits
      );


    const candidates =
      facts
        .filter((fact) => {
          return (
            isAnnualForm(
              fact.form
            ) &&
            fact.end ===
              periodEnd
          );
        })
        .sort(
          compareFactsNewestFirst
        );


    if (
      candidates.length > 0
    ) {
      return normalizeFact(
        candidates[0],
        conceptName,
        unit
      );
    }
  }


  return null;
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

      [
        "NetIncomeLoss"
      ],

      ["USD"],

      periodEnd
    );


  const dilutedEPS =
    findFactForAnnualPeriod(
      companyFacts,

      [
        "EarningsPerShareDiluted"
      ],

      [
        "USD/shares"
      ],

      periodEnd
    );


  const assets =
    findFactForAnnualPeriod(
      companyFacts,

      [
        "Assets"
      ],

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
        "PaymentsToAcquirePropertyPlantAndEquipment"
      ],

      ["USD"],

      periodEnd
    );


  let freeCashFlow =
    null;


  const operatingCashFlowValue =
    Number(
      operatingCashFlow?.value
    );

  const capitalExpenditureValue =
    Number(
      capitalExpenditures?.value
    );


  if (
    Number.isFinite(
      operatingCashFlowValue
    ) &&
    Number.isFinite(
      capitalExpenditureValue
    )
  ) {
    freeCashFlow = {
      value:
        operatingCashFlowValue -
        Math.abs(
          capitalExpenditureValue
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


  const companyFacts =
    await fetchCompanyFacts(
      company.cik,
      env
    );


  const fundamentals =
    buildFundamentals(
      companyFacts
    );


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
   WORKER
   ========================================= */

export default {
  async fetch(
    request,
    env
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
        error.message ===
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
