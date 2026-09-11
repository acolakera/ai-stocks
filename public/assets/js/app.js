import {
  DEFAULT_TICKER,
  demoStocks,
  chartPaths,
  periodChanges
} from "./data.js";

import {
  getFundamentals,
  getAnalysis
} from "./api.js?v=7";


let activeTicker =
  DEFAULT_TICKER;

let activePeriod =
  "1Y";

let toastTimeout =
  null;

/*
  Every time the selected stock changes,
  this number increases.

  Async responses belonging to an older
  stock selection are ignored.
*/

let activeRequestId =
  0;


/* =========================================
   DOM HELPERS
   ========================================= */

function getElement(id) {
  const element =
    document.getElementById(id);


  if (!element) {
    throw new Error(
      `Missing required element: #${id}`
    );
  }


  return element;
}


function createElement(
  tagName,
  className,
  textContent = ""
) {
  const element =
    document.createElement(
      tagName
    );


  if (className) {
    element.className =
      className;
  }


  if (textContent) {
    element.textContent =
      textContent;
  }


  return element;
}


/* =========================================
   TOAST
   ========================================= */

function showToast(message) {
  const toast =
    getElement("toast");


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  if (toastTimeout) {
    window.clearTimeout(
      toastTimeout
    );
  }


  toastTimeout =
    window.setTimeout(
      () => {
        toast.classList.remove(
          "show"
        );
      },
      2400
    );
}


/* =========================================
   FORMATTERS
   ========================================= */

function formatPercent(
  metric,
  {
    signed = false
  } = {}
) {
  const rawValue =
    metric?.value;


  if (
    rawValue === null ||
    rawValue === undefined
  ) {
    return "—";
  }


  const value =
    Number(rawValue);


  if (
    !Number.isFinite(value)
  ) {
    return "—";
  }


  const prefix =
    signed && value > 0
      ? "+"
      : "";


  return (
    `${prefix}${value.toFixed(1)}%`
  );
}


function formatCoverage(value) {
  const number =
    Number(value);


  if (
    !Number.isFinite(number)
  ) {
    return "—";
  }


  return (
    `${Math.round(number)}%`
  );
}


function getDemoMetric(
  stock,
  metricName
) {
  const metric =
    stock.metrics.find(
      (item) =>
        item[0] ===
        metricName
    );


  return (
    metric?.[1] ??
    "—"
  );
}


/* =========================================
   METRIC CARDS
   ========================================= */

function renderMetricCards(
  metrics
) {
  const grid =
    getElement(
      "metricsGrid"
    );


  grid.replaceChildren();


  metrics.forEach(
    ({
      name,
      value,
      context
    }) => {
      const card =
        createElement(
          "div",
          "metric-card"
        );


      const nameElement =
        createElement(
          "div",
          "metric-name",
          name
        );


      const valueElement =
        createElement(
          "div",
          "metric-value",
          value
        );


      const contextElement =
        createElement(
          "div",
          "metric-context",
          context
        );


      card.append(
        nameElement,
        valueElement,
        contextElement
      );


      grid.appendChild(
        card
      );
    }
  );
}


function renderMetricsLoading(
  stock
) {
  renderMetricCards([
    {
      name:
        "Market Cap",

      value:
        getDemoMetric(
          stock,
          "Market Cap"
        ),

      context:
        "Demo market data"
    },

    {
      name:
        "P/E Ratio",

      value:
        getDemoMetric(
          stock,
          "P/E Ratio"
        ),

      context:
        "Demo market data"
    },

    {
      name:
        "Revenue Growth",

      value:
        "—",

      context:
        "Loading SEC filing"
    },

    {
      name:
        "EPS Growth",

      value:
        "—",

      context:
        "Loading SEC filing"
    },

    {
      name:
        "FCF Margin",

      value:
        "—",

      context:
        "Loading SEC filing"
    },

    {
      name:
        "ROE",

      value:
        "—",

      context:
        "Loading SEC filing"
    }
  ]);
}


function renderMetricsUnavailable(
  stock
) {
  renderMetricCards([
    {
      name:
        "Market Cap",

      value:
        getDemoMetric(
          stock,
          "Market Cap"
        ),

      context:
        "Demo market data"
    },

    {
      name:
        "P/E Ratio",

      value:
        getDemoMetric(
          stock,
          "P/E Ratio"
        ),

      context:
        "Demo market data"
    },

    {
      name:
        "Revenue Growth",

      value:
        "—",

      context:
        "SEC data unavailable"
    },

    {
      name:
        "EPS Growth",

      value:
        "—",

      context:
        "SEC data unavailable"
    },

    {
      name:
        "FCF Margin",

      value:
        "—",

      context:
        "SEC data unavailable"
    },

    {
      name:
        "ROE",

      value:
        "—",

      context:
        "SEC data unavailable"
    }
  ]);
}


function renderLiveMetrics(
  stock,
  fundamentals
) {
  const current =
    fundamentals.current;

  const previous =
    fundamentals.previous;

  const derived =
    fundamentals.derived;


  const currentYear =
    current?.fiscalYear ??
    "—";

  const previousYear =
    previous?.fiscalYear ??
    "—";


  renderMetricCards([
    {
      name:
        "Market Cap",

      value:
        getDemoMetric(
          stock,
          "Market Cap"
        ),

      context:
        "Demo market data"
    },

    {
      name:
        "P/E Ratio",

      value:
        getDemoMetric(
          stock,
          "P/E Ratio"
        ),

      context:
        "Demo market data"
    },

    {
      name:
        "Revenue Growth",

      value:
        formatPercent(
          derived?.revenueGrowth,
          {
            signed: true
          }
        ),

      context:
        `SEC FY${currentYear} vs FY${previousYear}`
    },

    {
      name:
        "EPS Growth",

      value:
        formatPercent(
          derived?.epsGrowth,
          {
            signed: true
          }
        ),

      context:
        `SEC FY${currentYear} vs FY${previousYear}`
    },

    {
      name:
        "FCF Margin",

      value:
        formatPercent(
          derived?.freeCashFlowMargin
        ),

      context:
        `SEC FY${currentYear}`
    },

    {
      name:
        "ROE",

      value:
        formatPercent(
          derived?.returnOnEquity
        ),

      context:
        `SEC FY${currentYear}`
    }
  ]);
}


/* =========================================
   FUNDAMENTALS REQUEST
   ========================================= */

async function loadFundamentals(
  ticker,
  requestId
) {
  const stock =
    demoStocks[ticker];


  try {
    const response =
      await getFundamentals(
        ticker
      );


    if (
      requestId !==
        activeRequestId ||
      ticker !==
        activeTicker
    ) {
      return;
    }


    renderLiveMetrics(
      stock,
      response.fundamentals
    );


    const exchange =
      response.company
        ?.exchange ||
      stock.exchange ||
      "NASDAQ";


    getElement(
      "companyMeta"
    ).textContent =
      `${exchange} · ${stock.sector} · SEC fundamentals + demo market data`;
  }

  catch (error) {
    console.error(
      "Fundamentals request failed:",
      error
    );


    if (
      requestId !==
        activeRequestId ||
      ticker !==
        activeTicker
    ) {
      return;
    }


    renderMetricsUnavailable(
      stock
    );


    getElement(
      "companyMeta"
    ).textContent =
      `${stock.exchange} · ${stock.sector} · Demo market data`;


    showToast(
      "SEC fundamentals are temporarily unavailable."
    );
  }
}


/* =========================================
   CASE RENDERING
   ========================================= */

function createCaseItem(text) {
  const item =
    createElement(
      "div",
      "case-item"
    );


  const dot =
    createElement(
      "span",
      "case-dot"
    );


  const content =
    createElement(
      "span",
      "",
      text
    );


  item.append(
    dot,
    content
  );


  return item;
}


function renderCases(
  bull,
  bear
) {
  const bullList =
    getElement(
      "bullList"
    );

  const bearList =
    getElement(
      "bearList"
    );


  bullList.replaceChildren();

  bearList.replaceChildren();


  bull.forEach(
    (text) => {
      bullList.appendChild(
        createCaseItem(
          text
        )
      );
    }
  );


  bear.forEach(
    (text) => {
      bearList.appendChild(
        createCaseItem(
          text
        )
      );
    }
  );
}


/* =========================================
   FACTOR SCORES
   ========================================= */

const FACTOR_LABELS = {
  financialHealth:
    "Financial Health",

  profitability:
    "Profitability",

  growth:
    "Growth",

  cashFlow:
    "Cash Flow",

  capitalEfficiency:
    "Capital Efficiency",

  earningsQuality:
    "Earnings Quality"
};


function renderFactors(
  factors
) {
  const factorList =
    getElement(
      "factorList"
    );


  factorList.replaceChildren();


  Object.entries(
    FACTOR_LABELS
  ).forEach(
    ([key, label]) => {
      const rawScore =
        factors?.[key];


      const hasScore =
        Number.isFinite(
          Number(rawScore)
        );


      const score =
        hasScore
          ? Math.max(
              0,
              Math.min(
                Number(rawScore),
                100
              )
            )
          : null;


      const row =
        createElement(
          "div",
          "factor-row"
        );


      const nameElement =
        createElement(
          "span",
          "factor-name",
          label
        );


      const track =
        createElement(
          "div",
          "factor-track"
        );


      const fill =
        createElement(
          "div",
          "factor-fill"
        );


      fill.style.width =
        score === null
          ? "0%"
          : `${score}%`;


      const scoreElement =
        createElement(
          "span",
          "factor-score",
          score === null
            ? "—"
            : String(
                Math.round(
                  score
                )
              )
        );


      track.appendChild(
        fill
      );


      row.append(
        nameElement,
        track,
        scoreElement
      );


      factorList.appendChild(
        row
      );
    }
  );
}
/* =========================================
   SCORE METHODOLOGY
   ========================================= */

function hideMethodology() {
  const card =
    document.getElementById(
      "methodologyCard"
    );


  if (card) {
    card.hidden =
      true;
  }
}


function renderMethodology(
  analysis,
  scoring
) {
  const card =
    document.getElementById(
      "methodologyCard"
    );

  const rows =
    document.getElementById(
      "methodologyRows"
    );


  if (
    !card ||
    !rows
  ) {
    return;
  }


  const factors =
    analysis?.factors ??
    {};

  const weights =
    scoring
      ?.methodology
      ?.overallWeights ??
    {};


  const entries =
    Object.entries(
      FACTOR_LABELS
    )
      .map(
        ([key, label]) => {
          const score =
            Number(
              factors?.[key]
            );

          const weight =
            Number(
              weights?.[key]
            );


          if (
            !Number.isFinite(score) ||
            !Number.isFinite(weight)
          ) {
            return null;
          }


          return {
            key,
            label,
            score,
            weight,

            contribution:
              (
                score *
                weight
              ) /
              100
          };
        }
      )
      .filter(Boolean);


  if (
    entries.length === 0
  ) {
    hideMethodology();

    return;
  }


  rows.replaceChildren();


  let weightedScore =
    0;


  entries.forEach(
    ({
      label,
      score,
      weight,
      contribution
    }) => {
      weightedScore +=
        contribution;


      const row =
        createElement(
          "div",
          "methodology-row"
        );


      row.setAttribute(
        "role",
        "row"
      );


      const nameElement =
        createElement(
          "span",
          "methodology-factor-name",
          label
        );


      nameElement.setAttribute(
        "role",
        "cell"
      );


      const scoreElement =
        createElement(
          "span",
          "methodology-factor-score",
          String(
            Math.round(
              score
            )
          )
        );


      scoreElement.setAttribute(
        "role",
        "cell"
      );


      const weightElement =
        createElement(
          "span",
          "methodology-factor-weight",
          `${weight}%`
        );


      weightElement.setAttribute(
        "role",
        "cell"
      );


      const contributionElement =
        createElement(
          "span",
          "methodology-factor-contribution",
          `+${contribution.toFixed(2)}`
        );


      contributionElement.setAttribute(
        "role",
        "cell"
      );


      row.append(
        nameElement,
        scoreElement,
        weightElement,
        contributionElement
      );


      rows.appendChild(
        row
      );
    }
  );


  const methodologyScore =
    document.getElementById(
      "methodologyScore"
    );

  const methodologyVersion =
    document.getElementById(
      "methodologyVersion"
    );

  const weightedScoreElement =
    document.getElementById(
      "weightedScore"
    );

  const finalScoreElement =
    document.getElementById(
      "finalScore"
    );

  const methodologyNote =
    document.getElementById(
      "methodologyNote"
    );


  if (methodologyScore) {
    methodologyScore.textContent =
      String(
        analysis?.score ??
        "—"
      );
  }


  if (methodologyVersion) {
    methodologyVersion.textContent =
      analysis
        ?.scoringVersion ??
      "Deterministic";
  }


  if (weightedScoreElement) {
    weightedScoreElement.textContent =
      weightedScore.toFixed(
        2
      );
  }


  if (finalScoreElement) {
    finalScoreElement.textContent =
      String(
        analysis?.score ??
        "—"
      );
  }


  if (
    methodologyNote &&
    scoring
      ?.methodology
      ?.note
  ) {
    methodologyNote.textContent =
      scoring.methodology.note;
  }


  card.hidden =
    false;
}
/* =========================================
   FACTOR CALCULATIONS
   ========================================= */

function hideFactorDetails() {
  const card =
    document.getElementById(
      "factorDetailsCard"
    );

  if (card) {
    card.hidden =
      true;
  }
}


function formatFactorMetricValue(
  component
) {
  const value =
    Number(
      component?.rawValue
    );

  if (
    !Number.isFinite(value)
  ) {
    return "—";
  }


  const unit =
    component?.unit ??
    "";


  if (unit === "%") {
    const isGrowthMetric =
      String(
        component?.key ?? ""
      ).toLowerCase()
        .includes(
          "growth"
        );


    const sign =
      (
        isGrowthMetric &&
        value > 0
      )
        ? "+"
        : "";


    return (
      `${sign}${value.toFixed(1)}%`
    );
  }


  return value.toFixed(
    2
  );
}


function formatFactorComponentScore(
  value
) {
  const number =
    Number(value);


  if (
    !Number.isFinite(number)
  ) {
    return "—";
  }


  return number.toFixed(
    2
  );
}


function formatFactorWeight(
  value
) {
  const number =
    Number(value);


  if (
    !Number.isFinite(number)
  ) {
    return "—";
  }


const rounded =
  Math.round(number);


const formatted =
  Math.abs(
    number - rounded
  ) < 0.000001
    ? String(rounded)
    : number.toFixed(1);


return `${formatted}%`;
}


function formatFactorContribution(
  value
) {
  const number =
    Number(value);


  if (
    !Number.isFinite(number)
  ) {
    return "—";
  }


  const sign =
    number >= 0
      ? "+"
      : "";


  return (
    `${sign}${number.toFixed(2)}`
  );
}


function renderFactorDetails(
  scoring
) {
  const card =
    document.getElementById(
      "factorDetailsCard"
    );

  const list =
    document.getElementById(
      "factorDetailsList"
    );


  if (
    !card ||
    !list
  ) {
    return;
  }


  const details =
    scoring?.factorDetails;


  if (
    !details ||
    typeof details !== "object"
  ) {
    hideFactorDetails();
    return;
  }


  list.replaceChildren();


  Object.entries(
    FACTOR_LABELS
  ).forEach(
    ([key, label]) => {
      const detail =
        details?.[key];


      if (!detail) {
        return;
      }


      const factor =
        createElement(
          "section",
          "factor-detail"
        );


      const top =
        createElement(
          "div",
          "factor-detail-top"
        );


      const name =
        createElement(
          "div",
          "factor-detail-name",
          label
        );


      const result =
        createElement(
          "div",
          "factor-detail-result"
        );


      const unroundedValue =
        Number(
          detail?.unroundedScore
        );


      const finalValue =
        Number(
          detail?.finalScore
        );


      const unrounded =
        createElement(
          "span",
          "factor-detail-unrounded",
          Number.isFinite(
            unroundedValue
          )
            ? unroundedValue.toFixed(2)
            : "—"
        );


      const arrow =
        createElement(
          "span",
          "factor-detail-arrow",
          "→"
        );


      arrow.setAttribute(
        "aria-hidden",
        "true"
      );


      const finalScore =
        createElement(
          "span",
          "factor-detail-final",
          Number.isFinite(
            finalValue
          )
            ? String(finalValue)
            : "—"
        );


      result.append(
        unrounded,
        arrow,
        finalScore
      );


      top.append(
        name,
        result
      );


      const components =
        createElement(
          "div",
          "factor-components"
        );


      const header =
        createElement(
          "div",
          "factor-component-row factor-component-header"
        );


      [
        "Metric",
        "Value",
        "Component Score",
        "Weight",
        "Contribution"
      ].forEach(
        (text) => {
          header.appendChild(
            createElement(
              "span",
              "",
              text
            )
          );
        }
      );


      components.appendChild(
        header
      );


      const componentList =
        Array.isArray(
          detail?.components
        )
          ? detail.components
          : [];


      componentList.forEach(
        (component) => {
          const componentScore =
            Number(
              component
                ?.componentScore
            );


          const effectiveWeight =
            Number(
              component
                ?.effectiveWeightPercent
            );


          const contribution =
            Number(
              component
                ?.contribution
            );


          const hasScore =
            Number.isFinite(
              componentScore
            );


          const row =
            createElement(
              "div",
              hasScore
                ? "factor-component-row"
                : "factor-component-row factor-component-missing"
            );


          const metricName =
            createElement(
              "span",
              "factor-component-name",
              component?.label ??
              "Metric"
            );


          const rawValue =
            createElement(
              "span",
              "factor-component-raw",
              formatFactorMetricValue(
                component
              )
            );


          const score =
            createElement(
              "span",
              "factor-component-score",
              formatFactorComponentScore(
                componentScore
              )
            );


          const weight =
            createElement(
              "span",
              "factor-component-weight",
              formatFactorWeight(
                effectiveWeight
              )
            );


          const contributionElement =
            createElement(
              "span",
              "factor-component-contribution",
              formatFactorContribution(
                contribution
              )
            );


          row.append(
            metricName,
            rawValue,
            score,
            weight,
            contributionElement
          );


          components.appendChild(
            row
          );
        }
      );


      factor.append(
        top,
        components
      );


      list.appendChild(
        factor
      );
    }
  );


  if (
    list.children.length === 0
  ) {
    hideFactorDetails();
    return;
  }


  card.hidden =
    false;
}

/* =========================================
   SCORE RING
   ========================================= */

function renderScoreRing(score) {
  const safeScore =
    Math.max(
      0,
      Math.min(
        Number(score) || 0,
        100
      )
    );


  const degrees =
    Math.round(
      safeScore * 3.6
    );


  getElement(
    "scoreRing"
  ).style.background = `
    radial-gradient(
      circle,
      #0b0f14 60%,
      transparent 61%
    ),
    conic-gradient(
      #61e6ad 0deg ${degrees}deg,
      rgba(255, 255, 255, 0.075)
      ${degrees}deg 360deg
    )
  `;
}


/* =========================================
   AI RESEARCH STATES
   ========================================= */

function renderAnalysisLoading() {
  getElement(
    "aiScore"
  ).textContent =
    "—";


  getElement(
    "aiRating"
  ).textContent =
    "Loading";


  getElement(
    "aiHeading"
  ).textContent =
    "Generating fundamental research…";


  getElement(
    "aiSummary"
  ).textContent =
    "SEC fundamentals are being evaluated by the deterministic scoring model and AI research layer.";


  getElement(
    "signalView"
  ).textContent =
    "—";


  getElement(
    "confidenceValue"
  ).textContent =
    "—";


  getElement(
    "riskLevel"
  ).textContent =
    "—";


  renderScoreRing(
    0
  );


  renderCases(
    [
      "Generating evidence-based bull case…"
    ],

    [
      "Generating evidence-based bear case…"
    ]
  );


  renderFactors(
    null
  );
  hideMethodology();
  hideFactorDetails();
}


function renderAnalysisUnavailable() {
  getElement(
    "aiScore"
  ).textContent =
    "—";


  getElement(
    "aiRating"
  ).textContent =
    "Unavailable";


  getElement(
    "aiHeading"
  ).textContent =
    "Fundamental research unavailable";


  getElement(
    "aiSummary"
  ).textContent =
    "The AI research service could not be loaded. SEC fundamentals may still be available below.";


  getElement(
    "signalView"
  ).textContent =
    "—";


  getElement(
    "confidenceValue"
  ).textContent =
    "—";


  getElement(
    "riskLevel"
  ).textContent =
    "—";


  renderScoreRing(
    0
  );


  renderCases(
    [
      "AI research is temporarily unavailable."
    ],

    [
      "No AI-generated risk narrative is currently available."
    ]
  );


  renderFactors(
    null
  );
  hideMethodology();
  hideFactorDetails();
}


/* =========================================
   LIVE AI RESEARCH
   ========================================= */

function renderLiveAnalysis(
  analysis,
  scoring
) {
  getElement(
    "aiScore"
  ).textContent =
    String(
      analysis.score
    );


  getElement(
    "aiRating"
  ).textContent =
    analysis.rating;


  getElement(
    "aiHeading"
  ).textContent =
    analysis.heading;


  getElement(
    "aiSummary"
  ).textContent =
    analysis.summary;


  getElement(
    "signalView"
  ).textContent =
    analysis.rating;


  getElement(
    "confidenceValue"
  ).textContent =
    formatCoverage(
      analysis.dataCoverage
    );


  getElement(
    "riskLevel"
  ).textContent =
    analysis.riskLevel;


  renderScoreRing(
    analysis.score
  );


  renderCases(
    Array.isArray(
      analysis.bull
    )
      ? analysis.bull
      : [],

    Array.isArray(
      analysis.bear
    )
      ? analysis.bear
      : []
  );


renderFactors(
  analysis.factors
);


renderMethodology(
  analysis,
  scoring
);
  renderFactorDetails(
  scoring
);
}


async function loadAnalysis(
  ticker,
  requestId
) {
  try {
    const response =
      await getAnalysis(
        ticker
      );


    if (
      requestId !==
        activeRequestId ||
      ticker !==
        activeTicker
    ) {
      return;
    }


renderLiveAnalysis(
  response.analysis,
  response.scoring
);
  }

  catch (error) {
    console.error(
      "AI analysis request failed:",
      error
    );


    if (
      requestId !==
        activeRequestId ||
      ticker !==
        activeTicker
    ) {
      return;
    }


    renderAnalysisUnavailable();


    showToast(
      "AI research is temporarily unavailable."
    );
  }
}


/* =========================================
   CHART
   ========================================= */

function getPeriodChange(
  stock,
  period
) {
  if (
    period === "1D"
  ) {
    return (
      `${stock.change} 1D`
    );
  }


  if (
    period === "1Y"
  ) {
    return stock.yearly;
  }


  return (
    periodChanges[
      period
    ] ??
    ""
  );
}


function renderChartPeriod(
  period
) {
  const linePath =
    chartPaths[
      period
    ];


  if (!linePath) {
    return;
  }


  activePeriod =
    period;


  getElement(
    "chartLine"
  ).setAttribute(
    "d",
    linePath
  );


  getElement(
    "chartAreaPath"
  ).setAttribute(
    "d",
    `${linePath} L900 280 L0 280 Z`
  );


  const stock =
    demoStocks[
      activeTicker
    ];


  getElement(
    "chartChange"
  ).textContent =
    getPeriodChange(
      stock,
      period
    );


  document
    .querySelectorAll(
      ".period-button"
    )
    .forEach(
      (button) => {
        const isActive =
          button.dataset.period ===
          period;


        button.classList.toggle(
          "active",
          isActive
        );


        button.setAttribute(
          "aria-pressed",
          String(
            isActive
          )
        );
      }
    );
}


/* =========================================
   STOCK RENDERING
   ========================================= */

function renderStock(ticker) {
  const stock =
    demoStocks[
      ticker
    ];


  if (!stock) {
    return false;
  }


  activeTicker =
    ticker;


  const requestId =
    ++activeRequestId;


  getElement(
    "companyLogo"
  ).textContent =
    stock.logo;


  getElement(
    "companyName"
  ).textContent =
    stock.name;


  getElement(
    "tickerLabel"
  ).textContent =
    ticker;


  getElement(
    "companyMeta"
  ).textContent =
    `${stock.exchange} · ${stock.sector} · Loading SEC fundamentals`;


  getElement(
    "stockPrice"
  ).textContent =
    stock.price;


  getElement(
    "stockChange"
  ).textContent =
    stock.change;


  getElement(
    "chartPrice"
  ).textContent =
    stock.price;


  const marketMeta =
    document.querySelector(
      ".market-meta"
    );


  if (marketMeta) {
    marketMeta.textContent =
      `Demo market data · ${stock.currency}`;
  }


  /*
    Never display the old demo AI data
    while real analysis is loading.
  */

  renderAnalysisLoading();


  renderMetricsLoading(
    stock
  );


  renderChartPeriod(
    activePeriod
  );


  /*
    Fundamentals and AI research load
    independently.

    Neither blocks the initial UI render.
  */

  void loadFundamentals(
    ticker,
    requestId
  );


  void loadAnalysis(
    ticker,
    requestId
  );


  return true;
}


/* =========================================
   SEARCH
   ========================================= */

function selectStock(ticker) {
  const normalizedTicker =
    ticker
      .trim()
      .toUpperCase();


  const searchInput =
    getElement(
      "stockSearch"
    );


  searchInput.value =
    normalizedTicker;


  const success =
    renderStock(
      normalizedTicker
    );


  if (!success) {
    showToast(
      "Research preview: try AAPL, NVDA, MSFT, GOOGL or AMZN."
    );

    return;
  }


  getElement(
    "dashboard"
  ).scrollIntoView({
    behavior:
      "smooth",

    block:
      "start"
  });
}


function analyzeStock() {
  const searchInput =
    getElement(
      "stockSearch"
    );


  const ticker =
    searchInput.value
      .trim()
      .toUpperCase();


  if (!ticker) {
    showToast(
      "Enter a ticker symbol to analyze."
    );


    searchInput.focus();


    return;
  }


  if (
    !demoStocks[
      ticker
    ]
  ) {
    showToast(
      "Research preview: try AAPL, NVDA, MSFT, GOOGL or AMZN."
    );

    return;
  }


  selectStock(
    ticker
  );
}


/* =========================================
   EVENT LISTENERS
   ========================================= */

function setupSearchEvents() {
  const searchInput =
    getElement(
      "stockSearch"
    );


  const searchButton =
    document.querySelector(
      ".search-button"
    );


  searchInput.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
        "Enter"
      ) {
        analyzeStock();
      }
    }
  );


  searchButton
    ?.addEventListener(
      "click",
      analyzeStock
    );
}


function setupTickerButtons() {
  document
    .querySelectorAll(
      ".ticker-chip"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const ticker =
              button.dataset
                .ticker;


            if (ticker) {
              selectStock(
                ticker
              );
            }
          }
        );
      }
    );
}


function setupPeriodButtons() {
  document
    .querySelectorAll(
      ".period-button"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const period =
              button.dataset
                .period;


            if (period) {
              renderChartPeriod(
                period
              );
            }
          }
        );
      }
    );
}


/* =========================================
   INITIALIZATION
   ========================================= */

function initializeApp() {
  setupSearchEvents();

  setupTickerButtons();

  setupPeriodButtons();


  renderStock(
    DEFAULT_TICKER
  );
}


document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);
