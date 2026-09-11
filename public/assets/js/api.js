const DEFAULT_TIMEOUT_MS =
  10000;

const ANALYSIS_TIMEOUT_MS =
  45000;


/* =========================================
   REQUEST HELPER
   ========================================= */

async function requestJson(
  url,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = {}
) {
  const controller =
    new AbortController();


  const timeout =
    window.setTimeout(
      () => {
        controller.abort();
      },
      timeoutMs
    );


  try {
    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json"
          },

          signal:
            controller.signal
        }
      );


    let data = null;


    try {
      data =
        await response.json();
    }

    catch {
      throw new Error(
        "INVALID_API_RESPONSE"
      );
    }


    if (!response.ok) {
      const error =
        new Error(
          data?.error ||
          "API request failed."
        );


      error.status =
        response.status;


      throw error;
    }


    return data;
  }

  catch (error) {
    if (
      error.name ===
      "AbortError"
    ) {
      throw new Error(
        "REQUEST_TIMEOUT"
      );
    }


    throw error;
  }

  finally {
    window.clearTimeout(
      timeout
    );
  }
}


/* =========================================
   FUNDAMENTALS API
   ========================================= */

export async function getFundamentals(
  ticker
) {
  const symbol =
    String(ticker ?? "")
      .trim()
      .toUpperCase();


  if (!symbol) {
    throw new Error(
      "TICKER_REQUIRED"
    );
  }


  const url =
    `/api/fundamentals?symbol=${encodeURIComponent(symbol)}`;


  const response =
    await requestJson(
      url
    );


  if (
    !response?.ok ||
    !response?.fundamentals?.current
  ) {
    throw new Error(
      "FUNDAMENTALS_UNAVAILABLE"
    );
  }


  return response;
}


/* =========================================
   AI ANALYSIS API
   ========================================= */

export async function getAnalysis(
  ticker
) {
  const symbol =
    String(ticker ?? "")
      .trim()
      .toUpperCase();


  if (!symbol) {
    throw new Error(
      "TICKER_REQUIRED"
    );
  }


  const url =
    `/api/analysis?symbol=${encodeURIComponent(symbol)}`;


  const response =
    await requestJson(
      url,
      {
        timeoutMs:
          ANALYSIS_TIMEOUT_MS
      }
    );


  if (
    !response?.ok ||
    !response?.analysis
  ) {
    throw new Error(
      "ANALYSIS_UNAVAILABLE"
    );
  }


  return response;
}
