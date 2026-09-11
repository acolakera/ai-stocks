export const DEFAULT_TICKER = "AAPL";

export const demoStocks = {
  AAPL: {
    name: "Apple Inc.",
    exchange: "NASDAQ",
    sector: "Technology",
    currency: "USD",

    price: "$231.28",
    change: "+1.47%",
    yearly: "+18.62% 1Y",

    logo: "A",

    score: 79,
    rating: "Positive",
    heading: "Constructive outlook",
    confidence: "82%",
    risk: "Moderate",

    summary:
      "Strong profitability and durable cash generation support the investment case. Valuation remains the primary constraint as expectations are already elevated.",

    metrics: [
      ["Market Cap", "$3.5T", "Equity value"],
      ["P/E Ratio", "35.2×", "Forward"],
      ["Revenue Growth", "+6.1%", "Year over year"],
      ["EPS Growth", "+8.4%", "Year over year"],
      ["FCF Margin", "26.8%", "Trailing twelve months"],
      ["ROE", "157%", "Return on equity"]
    ],

    bull: [
      "High free cash flow generation supports buybacks, strategic investment and long-term capital flexibility.",
      "Ecosystem strength creates durable customer retention and recurring services revenue.",
      "Services mix expansion may continue supporting company-wide margin resilience."
    ],

    bear: [
      "Premium valuation reduces the margin of safety if future earnings growth disappoints.",
      "Mature hardware categories may limit long-term unit growth without major new product cycles.",
      "Regulatory pressure remains a potential risk to high-margin platform and services economics."
    ],

    factors: {
      "Financial Health": 91,
      Profitability: 94,
      Growth: 72,
      Valuation: 61,
      Momentum: 83,
      Risk: 68
    }
  },

  NVDA: {
    name: "NVIDIA Corporation",
    exchange: "NASDAQ",
    sector: "Semiconductors",
    currency: "USD",

    price: "$119.14",
    change: "+2.31%",
    yearly: "+42.18% 1Y",

    logo: "N",

    score: 86,
    rating: "Positive",
    heading: "Strong growth profile",
    confidence: "85%",
    risk: "Elevated",

    summary:
      "Exceptional earnings momentum and AI infrastructure demand support the outlook, while valuation and concentration risk remain important considerations.",

    metrics: [
      ["Market Cap", "$2.9T", "Equity value"],
      ["P/E Ratio", "32.8×", "Forward"],
      ["Revenue Growth", "+78.0%", "Year over year"],
      ["EPS Growth", "+95.0%", "Year over year"],
      ["FCF Margin", "44.2%", "Trailing twelve months"],
      ["ROE", "91%", "Return on equity"]
    ],

    bull: [
      "AI infrastructure demand remains a powerful structural growth driver.",
      "High margins and accelerating cash generation provide substantial reinvestment capacity.",
      "Software and ecosystem advantages strengthen competitive positioning."
    ],

    bear: [
      "Premium expectations increase downside sensitivity to slower growth.",
      "Customer concentration may amplify earnings volatility.",
      "Competitive pressure and custom silicon could reduce future market share."
    ],

    factors: {
      "Financial Health": 95,
      Profitability: 97,
      Growth: 98,
      Valuation: 57,
      Momentum: 92,
      Risk: 60
    }
  },

  MSFT: {
    name: "Microsoft Corporation",
    exchange: "NASDAQ",
    sector: "Technology",
    currency: "USD",

    price: "$507.42",
    change: "+0.88%",
    yearly: "+23.74% 1Y",

    logo: "M",

    score: 84,
    rating: "Positive",
    heading: "High-quality compounder",
    confidence: "87%",
    risk: "Moderate",

    summary:
      "Diversified recurring revenue, cloud leadership and strong balance-sheet quality support a durable long-term investment profile.",

    metrics: [
      ["Market Cap", "$3.8T", "Equity value"],
      ["P/E Ratio", "31.6×", "Forward"],
      ["Revenue Growth", "+14.7%", "Year over year"],
      ["EPS Growth", "+16.2%", "Year over year"],
      ["FCF Margin", "29.4%", "Trailing twelve months"],
      ["ROE", "34%", "Return on equity"]
    ],

    bull: [
      "Azure and AI services provide durable enterprise growth opportunities.",
      "Recurring software revenue improves earnings visibility and resilience.",
      "Strong balance-sheet quality supports sustained capital allocation."
    ],

    bear: [
      "Premium valuation requires sustained double-digit earnings growth.",
      "Heavy AI infrastructure spending may pressure near-term free cash flow.",
      "Regulatory scrutiny remains a structural risk across major markets."
    ],

    factors: {
      "Financial Health": 96,
      Profitability: 93,
      Growth: 84,
      Valuation: 64,
      Momentum: 82,
      Risk: 76
    }
  },

  GOOGL: {
    name: "Alphabet Inc.",
    exchange: "NASDAQ",
    sector: "Communication Services",
    currency: "USD",

    price: "$236.71",
    change: "+1.12%",
    yearly: "+27.09% 1Y",

    logo: "G",

    score: 82,
    rating: "Positive",
    heading: "Attractive quality profile",
    confidence: "84%",
    risk: "Moderate",

    summary:
      "Advertising strength, cloud growth and balance-sheet flexibility support the outlook, while AI disruption and regulation remain key uncertainties.",

    metrics: [
      ["Market Cap", "$2.9T", "Equity value"],
      ["P/E Ratio", "24.7×", "Forward"],
      ["Revenue Growth", "+13.6%", "Year over year"],
      ["EPS Growth", "+18.9%", "Year over year"],
      ["FCF Margin", "27.1%", "Trailing twelve months"],
      ["ROE", "31%", "Return on equity"]
    ],

    bull: [
      "Search economics remain highly profitable with substantial scale advantages.",
      "Cloud growth provides an increasingly meaningful second earnings engine.",
      "Large cash reserves create flexibility for AI investment and capital returns."
    ],

    bear: [
      "Generative AI may alter traditional search behavior and monetization.",
      "Antitrust actions could affect distribution and advertising economics.",
      "AI infrastructure spending may reduce near-term margin expansion."
    ],

    factors: {
      "Financial Health": 97,
      Profitability: 91,
      Growth: 82,
      Valuation: 76,
      Momentum: 84,
      Risk: 71
    }
  },

  AMZN: {
    name: "Amazon.com Inc.",
    exchange: "NASDAQ",
    sector: "Consumer Discretionary",
    currency: "USD",

    price: "$231.55",
    change: "+0.69%",
    yearly: "+19.45% 1Y",

    logo: "A",

    score: 80,
    rating: "Positive",
    heading: "Improving earnings quality",
    confidence: "81%",
    risk: "Moderate",

    summary:
      "AWS growth, retail efficiency and expanding margins support the investment case, although capital intensity and valuation remain relevant risks.",

    metrics: [
      ["Market Cap", "$2.5T", "Equity value"],
      ["P/E Ratio", "30.1×", "Forward"],
      ["Revenue Growth", "+10.8%", "Year over year"],
      ["EPS Growth", "+22.4%", "Year over year"],
      ["FCF Margin", "11.5%", "Trailing twelve months"],
      ["ROE", "23%", "Return on equity"]
    ],

    bull: [
      "AWS provides a high-margin growth engine with long-term AI exposure.",
      "Retail logistics efficiency creates significant operating leverage.",
      "Advertising continues expanding as a high-margin revenue stream."
    ],

    bear: [
      "Large capital expenditure requirements may constrain free cash flow.",
      "Retail remains exposed to consumer spending and competitive pressure.",
      "Valuation assumes continued margin and earnings expansion."
    ],

    factors: {
      "Financial Health": 87,
      Profitability: 79,
      Growth: 85,
      Valuation: 66,
      Momentum: 81,
      Risk: 70
    }
  }
};

export const chartPaths = {
  "1D": `
    M0 155
    C45 160, 72 138, 110 148
    C148 159, 180 128, 219 140
    C258 151, 286 119, 327 132
    C366 145, 402 113, 444 124
    C485 136, 515 98, 555 108
    C596 118, 626 83, 667 100
    C710 117, 741 78, 782 89
    C825 100, 858 73, 900 82
  `,

  "1W": `
    M0 211
    C39 186, 72 197, 111 170
    C151 143, 181 171, 221 147
    C261 123, 291 145, 331 118
    C371 92, 405 125, 444 102
    C487 77, 516 103, 555 86
    C598 67, 627 91, 669 63
    C711 35, 747 64, 787 50
    C828 36, 861 45, 900 29
  `,

  "1M": `
    M0 219
    C41 196, 72 207, 112 182
    C152 156, 185 181, 224 151
    C265 121, 295 158, 336 130
    C376 101, 411 133, 450 107
    C490 81, 522 118, 562 91
    C602 64, 633 89, 673 64
    C713 39, 749 70, 790 48
    C830 27, 865 43, 900 22
  `,

  "1Y": `
    M0 225
    C38 205, 70 218, 105 191
    C143 162, 175 186, 214 156
    C250 129, 279 162, 319 138
    C356 117, 391 136, 426 107
    C460 80, 490 112, 526 94
    C562 76, 590 109, 625 75
    C662 39, 694 75, 731 56
    C770 36, 806 61, 843 36
    C865 22, 881 31, 900 18
  `,

  "5Y": `
    M0 247
    C45 238, 72 247, 113 220
    C154 192, 186 216, 225 189
    C265 160, 298 188, 337 155
    C378 120, 410 152, 451 116
    C491 80, 524 117, 565 85
    C605 54, 639 83, 680 56
    C720 29, 756 54, 797 35
    C839 16, 870 27, 900 12
  `
};

export const periodChanges = {
  "1D": "+1.47% 1D",
  "1W": "+3.84% 1W",
  "1M": "+6.92% 1M",
  "1Y": "+18.62% 1Y",
  "5Y": "+311.4% 5Y"
};
