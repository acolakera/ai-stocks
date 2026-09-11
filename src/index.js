const SEC_TICKERS_URL =
  "https://www.sec.gov/files/company_tickers_exchange.json";

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
   TICKER NORMALIZATION
   ========================================= */

function normalizeTicker(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}


/* =========================================
   SEC REQUEST
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
      const ticker =
        normalizeTicker(
          item[tickerIndex]
        );

      return ticker === symbol;
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
   ROUTES
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


  try {
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

  catch (error) {
    console.error(
      "SEC lookup error:",
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
          "Unable to retrieve company data."
      },
      502
    );
  }
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
      return handleCompanyLookup(
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
};
