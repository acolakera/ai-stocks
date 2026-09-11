const OPENAI_RESPONSES_URL =
  "https://api.openai.com/v1/responses";

const OPENAI_MODEL =
  "gpt-5.6-terra";

const OPENAI_TIMEOUT_MS =
  30000;


/* =========================================
   SYSTEM INSTRUCTIONS
   ========================================= */

const ANALYSIS_INSTRUCTIONS = `
You are the fundamental equity research engine for AI Stocks.

Analyze ONLY the financial data explicitly provided in the input.

The input is sourced from SEC EDGAR annual filings and derived metrics
calculated from those filings.

Important rules:

1. Do not use outside knowledge.
2. Do not infer or invent current share price.
3. Do not infer or invent market capitalization.
4. Do not infer or invent P/E or other valuation multiples.
5. Do not use news, analyst estimates, price targets, guidance,
   market momentum, technical analysis, or events not contained
   in the provided data.
6. Do not give a buy, sell, or hold recommendation.
7. "rating" describes fundamental quality only. It is not an
   investment recommendation.
8. "score" is a fundamental research score from 0 to 100,
   where a higher score means stronger overall fundamentals
   based only on the supplied data.
9. Be conservative. Missing data must not be treated as zero.
10. Do not exaggerate certainty.
11. Keep the summary concise and professional.
12. Bull and bear cases must be grounded directly in the
    supplied financial figures.
13. Factor scores must be integers from 0 to 100.
14. Confidence must be an integer from 0 to 100.
15. Score must be an integer from 0 to 100.

Factor interpretation:

- financialHealth:
  balance sheet strength and liquidity.

- profitability:
  profitability and margins.

- growth:
  revenue and diluted EPS growth.

- cashFlow:
  operating cash flow, free cash flow and FCF margin.

- capitalEfficiency:
  efficiency of shareholder capital, including ROE where available.

- earningsQuality:
  relationship between reported earnings and cash generation.

Risk level must be one of:
Low, Moderate, Elevated, High.

Rating must be one of:
Positive, Neutral, Negative.

This research is informational and is not investment advice.
`;


/* =========================================
   STRUCTURED OUTPUT SCHEMA
   ========================================= */

const ANALYSIS_SCHEMA = {
  type: "object",

  additionalProperties: false,

  properties: {
    score: {
      type: "integer"
    },

    rating: {
      type: "string",

      enum: [
        "Positive",
        "Neutral",
        "Negative"
      ]
    },

    heading: {
      type: "string"
    },

    summary: {
      type: "string"
    },

    confidence: {
      type: "integer"
    },

    riskLevel: {
      type: "string",

      enum: [
        "Low",
        "Moderate",
        "Elevated",
        "High"
      ]
    },

    bullCase: {
      type: "object",

      additionalProperties: false,

      properties: {
        one: {
          type: "string"
        },

        two: {
          type: "string"
        },

        three: {
          type: "string"
        }
      },

      required: [
        "one",
        "two",
        "three"
      ]
    },

    bearCase: {
      type: "object",

      additionalProperties: false,

      properties: {
        one: {
          type: "string"
        },

        two: {
          type: "string"
        },

        three: {
          type: "string"
        }
      },

      required: [
        "one",
        "two",
        "three"
      ]
    },

    factors: {
      type: "object",

      additionalProperties: false,

      properties: {
        financialHealth: {
          type: "integer"
        },

        profitability: {
          type: "integer"
        },

        growth: {
          type: "integer"
        },

        cashFlow: {
          type: "integer"
        },

        capitalEfficiency: {
          type: "integer"
        },

        earningsQuality: {
          type: "integer"
        }
      },

      required: [
        "financialHealth",
        "profitability",
        "growth",
        "cashFlow",
        "capitalEfficiency",
        "earningsQuality"
      ]
    }
  },

  required: [
    "score",
    "rating",
    "heading",
    "summary",
    "confidence",
    "riskLevel",
    "bullCase",
    "bearCase",
    "factors"
  ]
};


/* =========================================
   NUMBER HELPERS
   ========================================= */

function finiteNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }


  const number =
    Number(value);


  return Number.isFinite(number)
    ? number
    : null;
}


function factValue(fact) {
  return finiteNumber(
    fact?.value
  );
}


function metricValue(metric) {
  return finiteNumber(
    metric?.value
  );
}


/* =========================================
   BUILD MODEL INPUT
   ========================================= */

function buildResearchInput(
  company,
  fundamentals
) {
  const current =
    fundamentals?.current ?? null;

  const previous =
    fundamentals?.previous ?? null;

  const derived =
    fundamentals?.derived ?? null;


  return {
    source: {
      provider:
        "SEC EDGAR",

      dataset:
        "Company Facts",

      dataType:
        "Annual reported financial statements"
    },


    company: {
      symbol:
        company?.symbol ?? null,

      name:
        company?.name ?? null,

      exchange:
        company?.exchange ?? null,

      cik:
        company?.cik ?? null
    },


    currentPeriod: {
      fiscalYear:
        current?.fiscalYear ?? null,

      periodEnd:
        current?.periodEnd ?? null,

      form:
        current?.form ?? null,

      filed:
        current?.filed ?? null,

      revenue:
        factValue(
          current?.revenue
        ),

      netIncome:
        factValue(
          current?.netIncome
        ),

      dilutedEPS:
        factValue(
          current?.dilutedEPS
        ),

      assets:
        factValue(
          current?.assets
        ),

      liabilities:
        factValue(
          current?.liabilities
        ),

      shareholdersEquity:
        factValue(
          current?.equity
        ),

      cashAndCashEquivalents:
        factValue(
          current?.cash
        ),

      operatingCashFlow:
        factValue(
          current?.operatingCashFlow
        ),

      capitalExpenditures:
        factValue(
          current?.capitalExpenditures
        ),

      freeCashFlow:
        factValue(
          current?.freeCashFlow
        )
    },


    previousPeriod: {
      fiscalYear:
        previous?.fiscalYear ?? null,

      periodEnd:
        previous?.periodEnd ?? null,

      revenue:
        factValue(
          previous?.revenue
        ),

      netIncome:
        factValue(
          previous?.netIncome
        ),

      dilutedEPS:
        factValue(
          previous?.dilutedEPS
        ),

      assets:
        factValue(
          previous?.assets
        ),

      liabilities:
        factValue(
          previous?.liabilities
        ),

      shareholdersEquity:
        factValue(
          previous?.equity
        ),

      cashAndCashEquivalents:
        factValue(
          previous?.cash
        ),

      operatingCashFlow:
        factValue(
          previous?.operatingCashFlow
        ),

      capitalExpenditures:
        factValue(
          previous?.capitalExpenditures
        ),

      freeCashFlow:
        factValue(
          previous?.freeCashFlow
        )
    },


    derivedMetrics: {
      revenueGrowthPercent:
        metricValue(
          derived?.revenueGrowth
        ),

      dilutedEPSGrowthPercent:
        metricValue(
          derived?.epsGrowth
        ),

      netMarginPercent:
        metricValue(
          derived?.netMargin
        ),

      freeCashFlowMarginPercent:
        metricValue(
          derived?.freeCashFlowMargin
        ),

      returnOnEquityPercent:
        metricValue(
          derived?.returnOnEquity
        ),

      averageShareholdersEquity:
        metricValue(
          derived?.averageEquity
        )
    }
  };
}


/* =========================================
   OUTPUT EXTRACTION
   ========================================= */

function extractOutputText(
  response
) {
  const output =
    Array.isArray(response?.output)
      ? response.output
      : [];


  for (const item of output) {
    if (
      item?.type !== "message" ||
      !Array.isArray(item.content)
    ) {
      continue;
    }


    for (
      const content
      of item.content
    ) {
      if (
        content?.type ===
          "output_text" &&
        typeof content.text ===
          "string"
      ) {
        return content.text;
      }
    }
  }


  return null;
}


/* =========================================
   VALIDATION HELPERS
   ========================================= */

function isScore(value) {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
  );
}


function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}


function validateCase(caseData) {
  return (
    caseData &&
    isNonEmptyString(
      caseData.one
    ) &&
    isNonEmptyString(
      caseData.two
    ) &&
    isNonEmptyString(
      caseData.three
    )
  );
}


function validateFactors(
  factors
) {
  if (!factors) {
    return false;
  }


  return [
    factors.financialHealth,
    factors.profitability,
    factors.growth,
    factors.cashFlow,
    factors.capitalEfficiency,
    factors.earningsQuality
  ].every(isScore);
}


/* =========================================
   NORMALIZE MODEL OUTPUT
   ========================================= */

function normalizeAnalysis(
  analysis
) {
  const validRatings =
    new Set([
      "Positive",
      "Neutral",
      "Negative"
    ]);


  const validRiskLevels =
    new Set([
      "Low",
      "Moderate",
      "Elevated",
      "High"
    ]);


  if (
    !analysis ||
    !isScore(
      analysis.score
    ) ||
    !isScore(
      analysis.confidence
    ) ||
    !validRatings.has(
      analysis.rating
    ) ||
    !validRiskLevels.has(
      analysis.riskLevel
    ) ||
    !isNonEmptyString(
      analysis.heading
    ) ||
    !isNonEmptyString(
      analysis.summary
    ) ||
    !validateCase(
      analysis.bullCase
    ) ||
    !validateCase(
      analysis.bearCase
    ) ||
    !validateFactors(
      analysis.factors
    )
  ) {
    throw new Error(
      "OPENAI_ANALYSIS_VALIDATION_FAILED"
    );
  }


  return {
    score:
      analysis.score,

    rating:
      analysis.rating,

    heading:
      analysis.heading.trim(),

    summary:
      analysis.summary.trim(),

    confidence:
      analysis.confidence,

    riskLevel:
      analysis.riskLevel,

    bull: [
      analysis.bullCase.one.trim(),
      analysis.bullCase.two.trim(),
      analysis.bullCase.three.trim()
    ],

    bear: [
      analysis.bearCase.one.trim(),
      analysis.bearCase.two.trim(),
      analysis.bearCase.three.trim()
    ],

    factors: {
      financialHealth:
        analysis
          .factors
          .financialHealth,

      profitability:
        analysis
          .factors
          .profitability,

      growth:
        analysis
          .factors
          .growth,

      cashFlow:
        analysis
          .factors
          .cashFlow,

      capitalEfficiency:
        analysis
          .factors
          .capitalEfficiency,

      earningsQuality:
        analysis
          .factors
          .earningsQuality
    }
  };
}


/* =========================================
   OPENAI REQUEST
   ========================================= */

export async function
generateFundamentalAnalysis(
  company,
  fundamentals,
  env
) {
  const apiKey =
    env.OPENAI_API_KEY?.trim();


  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY_NOT_CONFIGURED"
    );
  }


  const researchInput =
    buildResearchInput(
      company,
      fundamentals
    );


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      OPENAI_TIMEOUT_MS
    );


  try {
    const response =
      await fetch(
        OPENAI_RESPONSES_URL,
        {
          method:
            "POST",

          headers: {
            "Authorization":
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"
          },

          signal:
            controller.signal,

          body:
            JSON.stringify({
              model:
                OPENAI_MODEL,

              store:
                false,

              reasoning: {
                effort:
                  "medium"
              },

              max_output_tokens:
                1800,

              instructions:
                ANALYSIS_INSTRUCTIONS,

              input:
                JSON.stringify(
                  researchInput
                ),

              text: {
                format: {
                  type:
                    "json_schema",

                  name:
                    "fundamental_equity_research",

                  strict:
                    true,

                  schema:
                    ANALYSIS_SCHEMA
                }
              }
            })
        }
      );


    let responseBody = null;


    try {
      responseBody =
        await response.json();
    }

    catch {
      throw new Error(
        "OPENAI_INVALID_RESPONSE"
      );
    }


    if (!response.ok) {
      console.error(
        "OpenAI API request failed:",
        response.status,
        responseBody?.error?.code ??
          "unknown_error"
      );


      throw new Error(
        `OPENAI_REQUEST_FAILED_${response.status}`
      );
    }


    const outputText =
      extractOutputText(
        responseBody
      );


    if (!outputText) {
      throw new Error(
        "OPENAI_EMPTY_RESPONSE"
      );
    }


    let parsedAnalysis;


    try {
      parsedAnalysis =
        JSON.parse(
          outputText
        );
    }

    catch {
      throw new Error(
        "OPENAI_INVALID_STRUCTURED_OUTPUT"
      );
    }


    const analysis =
      normalizeAnalysis(
        parsedAnalysis
      );


    return {
      analysis,

      meta: {
        model:
          responseBody.model ??
          OPENAI_MODEL,

        responseId:
          responseBody.id ??
          null,

        generatedAt:
          new Date()
            .toISOString(),

        fiscalYear:
          fundamentals
            ?.current
            ?.fiscalYear ??
          null,

        periodEnd:
          fundamentals
            ?.current
            ?.periodEnd ??
          null,

        source:
          "SEC EDGAR annual fundamentals"
      }
    };
  }

  catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "OPENAI_REQUEST_TIMEOUT"
      );
    }


    throw error;
  }

  finally {
    clearTimeout(
      timeout
    );
  }
}
