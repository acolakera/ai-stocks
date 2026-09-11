import {
  DEFAULT_TICKER,
  demoStocks,
  chartPaths,
  periodChanges
} from "./data.js";


let activeTicker = DEFAULT_TICKER;
let activePeriod = "1Y";
let toastTimeout = null;


/* =========================================
   DOM HELPERS
   ========================================= */

function getElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element;
}


function createElement(
  tagName,
  className,
  textContent = ""
) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent) {
    element.textContent = textContent;
  }

  return element;
}


/* =========================================
   TOAST
   ========================================= */

function showToast(message) {
  const toast = getElement("toast");

  toast.textContent = message;
  toast.classList.add("show");

  if (toastTimeout) {
    window.clearTimeout(toastTimeout);
  }

  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}


/* =========================================
   METRICS
   ========================================= */

function renderMetrics(stock) {
  const grid = getElement("metricsGrid");

  grid.replaceChildren();

  stock.metrics.forEach(
    ([name, value, context]) => {
      const card = createElement(
        "div",
        "metric-card"
      );

      const nameElement = createElement(
        "div",
        "metric-name",
        name
      );

      const valueElement = createElement(
        "div",
        "metric-value",
        value
      );

      const contextElement = createElement(
        "div",
        "metric-context",
        context
      );

      card.append(
        nameElement,
        valueElement,
        contextElement
      );

      grid.appendChild(card);
    }
  );
}


/* =========================================
   BULL / BEAR CASES
   ========================================= */

function createCaseItem(text) {
  const item = createElement(
    "div",
    "case-item"
  );

  const dot = createElement(
    "span",
    "case-dot"
  );

  const content = createElement(
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


function renderCases(stock) {
  const bullList = getElement("bullList");
  const bearList = getElement("bearList");

  bullList.replaceChildren();
  bearList.replaceChildren();

  stock.bull.forEach((text) => {
    bullList.appendChild(
      createCaseItem(text)
    );
  });

  stock.bear.forEach((text) => {
    bearList.appendChild(
      createCaseItem(text)
    );
  });
}


/* =========================================
   FACTOR SCORES
   ========================================= */

function renderFactors(stock) {
  const factorList =
    getElement("factorList");

  factorList.replaceChildren();

  Object.entries(stock.factors)
    .forEach(([name, score]) => {
      const row = createElement(
        "div",
        "factor-row"
      );

      const nameElement = createElement(
        "span",
        "factor-name",
        name
      );

      const track = createElement(
        "div",
        "factor-track"
      );

      const fill = createElement(
        "div",
        "factor-fill"
      );

      fill.style.width =
        `${Math.max(0, Math.min(score, 100))}%`;

      const scoreElement = createElement(
        "span",
        "factor-score",
        String(score)
      );

      track.appendChild(fill);

      row.append(
        nameElement,
        track,
        scoreElement
      );

      factorList.appendChild(row);
    });
}


/* =========================================
   AI SCORE
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
    Math.round(safeScore * 3.6);

  getElement("scoreRing").style.background = `
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
   CHART
   ========================================= */

function getPeriodChange(
  stock,
  period
) {
  if (period === "1D") {
    return `${stock.change} 1D`;
  }

  if (period === "1Y") {
    return stock.yearly;
  }

  return periodChanges[period] ?? "";
}


function renderChartPeriod(period) {
  const linePath =
    chartPaths[period];

  if (!linePath) {
    return;
  }

  activePeriod = period;

  getElement("chartLine")
    .setAttribute(
      "d",
      linePath
    );

  getElement("chartAreaPath")
    .setAttribute(
      "d",
      `${linePath} L900 280 L0 280 Z`
    );

  const stock =
    demoStocks[activeTicker];

  getElement("chartChange").textContent =
    getPeriodChange(
      stock,
      period
    );

  document
    .querySelectorAll(".period-button")
    .forEach((button) => {
      const isActive =
        button.dataset.period === period;

      button.classList.toggle(
        "active",
        isActive
      );

      button.setAttribute(
        "aria-pressed",
        String(isActive)
      );
    });
}


/* =========================================
   STOCK RENDERING
   ========================================= */

function renderStock(ticker) {
  const stock =
    demoStocks[ticker];

  if (!stock) {
    return false;
  }

  activeTicker = ticker;

  getElement("companyLogo").textContent =
    stock.logo;

  getElement("companyName").textContent =
    stock.name;

  getElement("tickerLabel").textContent =
    ticker;

  getElement("companyMeta").textContent =
    `${stock.exchange} · ${stock.sector} · Demo data`;

  getElement("stockPrice").textContent =
    stock.price;

  getElement("stockChange").textContent =
    stock.change;

  getElement("chartPrice").textContent =
    stock.price;

  getElement("aiScore").textContent =
    String(stock.score);

  getElement("aiRating").textContent =
    stock.rating;

  getElement("aiHeading").textContent =
    stock.heading;

  getElement("aiSummary").textContent =
    stock.summary;

  getElement("signalView").textContent =
    stock.rating;

  getElement("confidenceValue").textContent =
    stock.confidence;

  getElement("riskLevel").textContent =
    stock.risk;

  const marketMeta =
    document.querySelector(".market-meta");

  if (marketMeta) {
    marketMeta.textContent =
      `Demo market data · ${stock.currency}`;
  }

  renderScoreRing(stock.score);
  renderMetrics(stock);
  renderCases(stock);
  renderFactors(stock);

  /*
    Keep the selected chart period when
    switching between stocks.
  */
  renderChartPeriod(activePeriod);

  return true;
}


/* =========================================
   SEARCH
   ========================================= */

function selectStock(ticker) {
  const normalizedTicker =
    ticker.trim().toUpperCase();

  const searchInput =
    getElement("stockSearch");

  searchInput.value =
    normalizedTicker;

  const success =
    renderStock(normalizedTicker);

  if (!success) {
    showToast(
      "Research preview: try AAPL, NVDA, MSFT, GOOGL or AMZN."
    );

    return;
  }

  getElement("dashboard")
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}


function analyzeStock() {
  const searchInput =
    getElement("stockSearch");

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

  if (!demoStocks[ticker]) {
    showToast(
      "Research preview: try AAPL, NVDA, MSFT, GOOGL or AMZN."
    );

    return;
  }

  selectStock(ticker);
}


/* =========================================
   EVENT LISTENERS
   ========================================= */

function setupSearchEvents() {
  const searchInput =
    getElement("stockSearch");

  const searchButton =
    document.querySelector(".search-button");

  searchInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        analyzeStock();
      }
    }
  );

  searchButton?.addEventListener(
    "click",
    analyzeStock
  );
}


function setupTickerButtons() {
  document
    .querySelectorAll(".ticker-chip")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const ticker =
            button.dataset.ticker;

          if (ticker) {
            selectStock(ticker);
          }
        }
      );
    });
}


function setupPeriodButtons() {
  document
    .querySelectorAll(".period-button")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const period =
            button.dataset.period;

          if (period) {
            renderChartPeriod(period);
          }
        }
      );
    });
}


/* =========================================
   INITIALIZATION
   ========================================= */

function initializeApp() {
  setupSearchEvents();
  setupTickerButtons();
  setupPeriodButtons();

  renderStock(DEFAULT_TICKER);
  renderChartPeriod(activePeriod);
}


document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);
