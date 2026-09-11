import {
  buildFundamentalScore
} from "./scoring.js";


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
You are the fundamental equity research narrative engine for AI Stocks.

Analyze ONLY the financial data explicitly provided in the input.

The financial data is sourced from SEC EDGAR annual filings.
The numerical score, rating, risk level, data coverage, and factor
scores are calculated separately by a deterministic scoring engine.

Important rules:

1. Do not create, alter, estimate, or override any score.
2. Do not create, alter, estimate, or override the rating.
3. Do not create, alter, estimate, or override the risk level.
4. Do not create, alter, estimate, or override factor scores.
5. Do not use outside knowledge.
6. Do not infer or invent current share price.
7. Do not infer or invent market capitalization.
8. Do not infer or invent P/E or other valuation multiples.
9. Do not use news, analyst estimates, price targets, guidance,
   technical analysis, market momentum, or information not
   contained in the supplied input.
10. Do not give a buy, sell, or hold recommendation.
11. Missing financial data must not be treated as zero.
12. Do not exaggerate certainty.
13. Keep the heading concise and professional.
14. Keep the summary concise and evidence-based.
15. Every bull and bear point must be directly supported by the
    supplied financial figures.
16. When discussing unusually high ROE, remember that a small
    equity base can mechanically amplify ROE.
17. The deterministic scoring output is context for the narrative,
    not an investment recommendation.

This research is informational and is not investment advice.
`;


/* =========================================
   STRUCTURED OUTPUT SCHEMA
   ========================================= */

const ANALYSIS_SCHEMA = {
  type: "object",

  additionalProperties: false,

  properties: {
    heading: {
      type: "string"
    },

    summary: {
      type: "string"
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
    }
  },

  required: [
    "heading",
    "summary",
    "bullCase",
    "bearCase"
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
  fundamentals,
  scoring
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
    },


    deterministicScoring: {
      version:
        scoring.version,

      score:
        scoring.score,

      rating:
        scoring.rating,

      riskLevel:
        scoring.riskLevel,

      dataCoveragePercent:
        scoring.dataCoverage,

      factors:
        scoring.factors
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
   VALIDATION
   ========================================= */

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


function normalizeNarrative(
  narrative
) {
  if (
    !narrative ||
    !isNonEmptyString(
      narrative.heading
    ) ||
    !isNonEmptyString(
      narrative.summary
    ) ||
    !validateCase(
      narrative.bullCase
    ) ||
    !validateCase(
      narrative.bearCase
    )
  ) {
    throw new Error(
      "OPENAI_ANALYSIS_VALIDATION_FAILED"
    );
  }


  return {
    heading:
      narrative.heading.trim(),

    summary:
      narrative.summary.trim(),

    bull: [
      narrative.bullCase.one.trim(),
      narrative.bullCase.two.trim(),
      narrative.bullCase.three.trim()
    ],

    bear: [
      narrative.bearCase.one.trim(),
      narrative.bearCase.two.trim(),
      narrative.bearCase.three.trim()
    ]
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


  /*
    Scores are calculated BEFORE the
    model is called.

    OpenAI does not choose any numerical
    score in this architecture.
  */

  const scoring =
    buildFundamentalScore(
      fundamentals
    );


  if (
    scoring?.score === null ||
    scoring?.score === undefined
  ) {
    throw new Error(
      "FUNDAMENTAL_SCORE_UNAVAILABLE"
    );
  }


  const researchInput =
    buildResearchInput(
      company,
      fundamentals,
      scoring
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
                    "fundamental_equity_research_narrative",

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


    let parsedNarrative;


    try {
      parsedNarrative =
        JSON.parse(
          outputText
        );
    }

    catch {
      throw new Error(
        "OPENAI_INVALID_STRUCTURED_OUTPUT"
      );
    }


    const narrative =
      normalizeNarrative(
        parsedNarrative
      );


    return {
      analysis: {
        score:
          scoring.score,

        rating:
          scoring.rating,

        riskLevel:
          scoring.riskLevel,

        dataCoverage:
          scoring.dataCoverage,

        scoringVersion:
          scoring.version,

        heading:
          narrative.heading,

        summary:
          narrative.summary,

        bull:
          narrative.bull,

        bear:
          narrative.bear,

        factors:
          scoring.factors
      },


      scoring: {
        rawMetrics:
          scoring.rawMetrics,

        methodology:
          scoring.methodology
      },


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
