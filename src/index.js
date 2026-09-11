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
          "User-Agent": userAgent,
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
  conceptNames
) {
  const usGaap =
    companyFacts?.facts?.["us-gaap"];

  if (!usGaap) {
    return null;
  }

  for (
    const conceptName
    of conceptNames
  ) {
    const concept =
      usGaap[conceptName];

    if (concept) {
      return {
        conceptName,
        concept
      };
    }
  }

  return null;
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
    unit: fallbackUnit,
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
   ANNUAL FACT SELECTION
   ========================================= */

function findLatestAnnualFact(
  companyFacts,
  conceptNames,
  preferredUnits
) {
  for (
    const conceptName
    of conceptNames
  ) {
    const result =
      getConcept(
        companyFacts,
        [conceptName]
      );

    if (!result) {
      continue;
    }


    const {
      unit,
      facts
    } =
      getFactsFromUnits(
        result.concept,
        preferredUnits
      );


    const candidates =
      facts
        .filter((fact) => {
          return (
            isAnnualForm(
              fact.form
            ) &&
            fact.fp === "FY" &&
            fact.end
          );
        })
        .sort(
          compareFactsNewestFirst
        );


    if (candidates.length > 0) {
      return normalizeFact(
        candidates[0],
        conceptName,
        unit
      );
    }
  }


  return null;
}


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
    const result =
      getConcept(
        companyFacts,
        [conceptName]
      );

    if (!result) {
      continue;
    }


    const {
      unit,
      facts
    } =
      getFactsFromUnits(
        result.concept,
        preferredUnits
      );


    const candidates =
      facts
        .filter((fact) => {
          return (
            isAnnualForm(
              fact.form
            ) &&
            fact.end === periodEnd
          );
        })
        .sort(
          (a, b) => {
            return String(
              b.filed ?? ""
            ).localeCompare(
              String(
                a.filed ?? ""
              )
            );
          }
        );


    if (candidates.length > 0) {
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
   FUNDAMENTALS
   ========================================= */

function buildAnnualFundamentals(
  companyFacts
) {
  /*
    Revenue is used as the anchor so all
    other metrics come from the same
    fiscal-year end.
  */

  const revenue =
    findLatestAnnualFact(
      companyFacts,

      [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet"
      ],

      ["USD"]
    );


  if (!revenue) {
    return null;
  }


  const periodEnd =
    revenue.end;


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


  if (
    operatingCashFlow &&
    capitalExpenditures &&
    Number.isFinite(
      Number(
        operatingCashFlow.value
      )
    ) &&
    Number.isFinite(
      Number(
        capitalExpenditures.value
      )
    )
  ) {
    freeCashFlow = {
      value:
        Number(
          operatingCashFlow.value
        ) -
        Math.abs(
          Number(
            capitalExpenditures.value
          )
        ),

      unit: "USD",

      derived: true,

      formula:
        "Operating Cash Flow - Capital Expenditures",

      end:
        periodEnd
    };
  }


  return {
    fiscalYear:
      revenue.fiscalYear,

    periodEnd,

    filed:
      revenue.filed,

    form:
      revenue.form,

    revenue,

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
   ROUTE: COMPANY
   ========================================= */

async function handleCompanyLookup(
  request,
  env
) {
  const url =
    new URL(request.url);

  const symbol =
    normalizeTicker(
      url.searchParams.get("symbol")
    );


  if (!symbol) {
    return jsonResponse(
      {
        error:
          "A ticker symbol is required."
      },
      400
    );
  }


  if (!TICKER_PATTERN.test(symbol)) {
    return jsonResponse(
      {
        error:
          "Invalid ticker symbol."
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
  const url =
    new URL(request.url);

  const symbol =
    normalizeTicker(
      url.searchParams.get("symbol")
    );


  if (!symbol) {
    return jsonResponse(
      {
        error:
          "A ticker symbol is required."
      },
      400
    );
  }


  if (!TICKER_PATTERN.test(symbol)) {
    return jsonResponse(
      {
        error:
          "Invalid ticker symbol."
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


  const annual =
    buildAnnualFundamentals(
      companyFacts
    );


  if (!annual) {
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

      fundamentals: {
        annual
      },

      source: {
        provider:
          "SEC EDGAR",

        dataset:
          "Company Facts",

        type:
          "Reported financial statements"
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
