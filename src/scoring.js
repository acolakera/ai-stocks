const SCORING_VERSION =
  "fundamentals-v1";


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


function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}


function roundScore(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return null;
  }


  return Math.round(
    clamp(
      value,
      0,
      100
    )
  );
}


/* =========================================
   LINEAR SCORE MAPPING
   ========================================= */

/*
  Converts a raw financial metric into
  a 0–100 score using transparent,
  piecewise-linear bands.

  Example:

  [
    [0, 20],
    [10, 60],
    [20, 90]
  ]

  A raw value of 15 would score 75.
*/

function scoreFromBands(
  value,
  bands
) {
  const number =
    finiteNumber(value);


  if (
    number === null ||
    !Array.isArray(bands) ||
    bands.length === 0
  ) {
    return null;
  }


  if (
    number <= bands[0][0]
  ) {
    return bands[0][1];
  }


  const lastBand =
    bands[
      bands.length - 1
    ];


  if (
    number >= lastBand[0]
  ) {
    return lastBand[1];
  }


  for (
    let index = 0;
    index < bands.length - 1;
    index += 1
  ) {
    const [
      lowerValue,
      lowerScore
    ] =
      bands[index];


    const [
      upperValue,
      upperScore
    ] =
      bands[index + 1];


    if (
      number >= lowerValue &&
      number <= upperValue
    ) {
      const position =
        (
          number -
          lowerValue
        ) /
        (
          upperValue -
          lowerValue
        );


      return (
        lowerScore +
        (
          upperScore -
          lowerScore
        ) *
        position
      );
    }
  }


  return null;
}


/* =========================================
   WEIGHTED AVERAGE
   ========================================= */

function weightedAverage(
  components
) {
  let totalWeight = 0;
  let weightedTotal = 0;


  components.forEach(
    ({
      value,
      weight
    }) => {
      if (
        value === null ||
        value === undefined ||
        !Number.isFinite(value)
      ) {
        return;
      }


      weightedTotal +=
        value * weight;

      totalWeight +=
        weight;
    }
  );


  if (
    totalWeight === 0
  ) {
    return null;
  }


  return (
    weightedTotal /
    totalWeight
  );
}


/* =========================================
   RAW METRIC HELPERS
   ========================================= */

function percentageRatio(
  numerator,
  denominator
) {
  const top =
    finiteNumber(numerator);

  const bottom =
    finiteNumber(denominator);


  if (
    top === null ||
    bottom === null ||
    bottom === 0
  ) {
    return null;
  }


  return (
    top /
    bottom
  ) * 100;
}


function percentageGrowth(
  currentValue,
  previousValue
) {
  const current =
    finiteNumber(
      currentValue
    );

  const previous =
    finiteNumber(
      previousValue
    );


  if (
    current === null ||
    previous === null ||
    previous === 0
  ) {
    return null;
  }


  return (
    (
      current /
      previous
    ) - 1
  ) * 100;
}


/* =========================================
   FACTOR: FINANCIAL HEALTH
   ========================================= */

function scoreFinancialHealth(
  raw
) {
  const equityRatioScore =
    scoreFromBands(
      raw.equityToAssetsPercent,

      [
        [0, 10],
        [10, 25],
        [20, 45],
        [30, 65],
        [40, 80],
        [50, 90],
        [65, 100]
      ]
    );


  const cashRatioScore =
    scoreFromBands(
      raw.cashToAssetsPercent,

      [
        [0, 20],
        [2, 35],
        [5, 55],
        [10, 75],
        [20, 90],
        [30, 100]
      ]
    );


  return weightedAverage([
    {
      value:
        equityRatioScore,

      weight:
        0.7
    },

    {
      value:
        cashRatioScore,

      weight:
        0.3
    }
  ]);
}


/* =========================================
   FACTOR: PROFITABILITY
   ========================================= */

function scoreProfitability(
  raw
) {
  return scoreFromBands(
    raw.netMarginPercent,

    [
      [-10, 0],
      [0, 25],
      [5, 45],
      [10, 60],
      [20, 80],
      [30, 95],
      [40, 100]
    ]
  );
}


/* =========================================
   FACTOR: GROWTH
   ========================================= */

function scoreGrowth(
  raw
) {
  const revenueGrowthScore =
    scoreFromBands(
      raw.revenueGrowthPercent,

      [
        [-20, 0],
        [-10, 15],
        [0, 40],
        [5, 55],
        [10, 70],
        [20, 90],
        [30, 100]
      ]
    );


  const epsGrowthScore =
    scoreFromBands(
      raw.epsGrowthPercent,

      [
        [-30, 0],
        [-10, 20],
        [0, 40],
        [10, 60],
        [20, 75],
        [40, 95],
        [60, 100]
      ]
    );


  return weightedAverage([
    {
      value:
        revenueGrowthScore,

      weight:
        0.55
    },

    {
      value:
        epsGrowthScore,

      weight:
        0.45
    }
  ]);
}


/* =========================================
   FACTOR: CASH FLOW
   ========================================= */

function scoreCashFlow(
  raw
) {
  const marginScore =
    scoreFromBands(
      raw.freeCashFlowMarginPercent,

      [
        [-10, 0],
        [0, 30],
        [5, 50],
        [10, 65],
        [20, 85],
        [30, 95],
        [40, 100]
      ]
    );


  const growthScore =
    scoreFromBands(
      raw.freeCashFlowGrowthPercent,

      [
        [-30, 0],
        [-10, 25],
        [0, 50],
        [10, 65],
        [25, 80],
        [50, 95],
        [75, 100]
      ]
    );


  return weightedAverage([
    {
      value:
        marginScore,

      weight:
        0.7
    },

    {
      value:
        growthScore,

      weight:
        0.3
    }
  ]);
}


/* =========================================
   FACTOR: CAPITAL EFFICIENCY
   ========================================= */

function scoreCapitalEfficiency(
  raw
) {
  /*
    ROE is deliberately not allowed
    to dominate this factor.

    A very high ROE can be amplified
    by a small equity base, so the
    equity/assets ratio acts as a
    balance-sheet counterweight.
  */

  const roeScore =
    scoreFromBands(
      raw.returnOnEquityPercent,

      [
        [-20, 0],
        [0, 30],
        [10, 50],
        [20, 70],
        [30, 85],
        [40, 95],
        [60, 100]
      ]
    );


  const equityRatioScore =
    scoreFromBands(
      raw.equityToAssetsPercent,

      [
        [0, 10],
        [10, 25],
        [20, 45],
        [30, 65],
        [40, 80],
        [50, 90],
        [65, 100]
      ]
    );


  return weightedAverage([
    {
      value:
        roeScore,

      weight:
        0.7
    },

    {
      value:
        equityRatioScore,

      weight:
        0.3
    }
  ]);
}


/* =========================================
   FACTOR: EARNINGS QUALITY
   ========================================= */

function scoreEarningsQuality(
  raw
) {
  const operatingCashConversionScore =
    scoreFromBands(
      raw.operatingCashFlowToNetIncomePercent,

      [
        [0, 0],
        [50, 40],
        [75, 65],
        [90, 80],
        [100, 95],
        [120, 100]
      ]
    );


  const freeCashConversionScore =
    scoreFromBands(
      raw.freeCashFlowToNetIncomePercent,

      [
        [0, 20],
        [25, 40],
        [50, 60],
        [75, 80],
        [100, 95],
        [125, 100]
      ]
    );


  return weightedAverage([
    {
      value:
        operatingCashConversionScore,

      weight:
        0.7
    },

    {
      value:
        freeCashConversionScore,

      weight:
        0.3
    }
  ]);
}


/* =========================================
   RATING
   ========================================= */

function getRating(score) {
  if (score === null) {
    return "Neutral";
  }


  if (score >= 75) {
    return "Positive";
  }


  if (score >= 55) {
    return "Neutral";
  }


  return "Negative";
}


/* =========================================
   FUNDAMENTAL RISK
   ========================================= */

function getRiskLevel(
  factors
) {
  const defensiveScore =
    weightedAverage([
      {
        value:
          factors.financialHealth,

        weight:
          0.4
      },

      {
        value:
          factors.cashFlow,

        weight:
          0.35
      },

      {
        value:
          factors.earningsQuality,

        weight:
          0.25
      }
    ]);


  if (
    defensiveScore === null
  ) {
    return "Elevated";
  }


  if (
    defensiveScore >= 80
  ) {
    return "Low";
  }


  if (
    defensiveScore >= 60
  ) {
    return "Moderate";
  }


  if (
    defensiveScore >= 40
  ) {
    return "Elevated";
  }


  return "High";
}


/* =========================================
   DATA COVERAGE
   ========================================= */

function calculateCoverage(
  raw
) {
  const expectedValues = [
    raw.revenueGrowthPercent,
    raw.epsGrowthPercent,
    raw.netMarginPercent,
    raw.freeCashFlowMarginPercent,
    raw.returnOnEquityPercent,
    raw.equityToAssetsPercent,
    raw.cashToAssetsPercent,
    raw.freeCashFlowGrowthPercent,
    raw.operatingCashFlowToNetIncomePercent,
    raw.freeCashFlowToNetIncomePercent
  ];


  const available =
    expectedValues.filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        Number.isFinite(value)
    ).length;


  return Math.round(
    (
      available /
      expectedValues.length
    ) * 100
  );
}


/* =========================================
   BUILD RAW SCORING METRICS
   ========================================= */

function buildRawMetrics(
  fundamentals
) {
  const current =
    fundamentals?.current ?? null;

  const previous =
    fundamentals?.previous ?? null;

  const derived =
    fundamentals?.derived ?? null;


  const revenue =
    factValue(
      current?.revenue
    );

  const netIncome =
    factValue(
      current?.netIncome
    );

  const assets =
    factValue(
      current?.assets
    );

  const equity =
    factValue(
      current?.equity
    );

  const cash =
    factValue(
      current?.cash
    );

  const operatingCashFlow =
    factValue(
      current?.operatingCashFlow
    );

  const freeCashFlow =
    factValue(
      current?.freeCashFlow
    );

  const previousFreeCashFlow =
    factValue(
      previous?.freeCashFlow
    );


  return {
    revenueGrowthPercent:
      metricValue(
        derived?.revenueGrowth
      ),

    epsGrowthPercent:
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


    equityToAssetsPercent:
      percentageRatio(
        equity,
        assets
      ),


    cashToAssetsPercent:
      percentageRatio(
        cash,
        assets
      ),


    freeCashFlowGrowthPercent:
      percentageGrowth(
        freeCashFlow,
        previousFreeCashFlow
      ),


    operatingCashFlowToNetIncomePercent:
      (
        netIncome !== null &&
        netIncome > 0
      )
        ? percentageRatio(
            operatingCashFlow,
            netIncome
          )
        : null,


    freeCashFlowToNetIncomePercent:
      (
        netIncome !== null &&
        netIncome > 0
      )
        ? percentageRatio(
            freeCashFlow,
            netIncome
          )
        : null,


    revenue,
    netIncome,
    operatingCashFlow,
    freeCashFlow
  };
}


/* =========================================
   PUBLIC SCORING FUNCTION
   ========================================= */

export function buildFundamentalScore(
  fundamentals
) {
  const raw =
    buildRawMetrics(
      fundamentals
    );


  const factors = {
    financialHealth:
      roundScore(
        scoreFinancialHealth(
          raw
        )
      ),

    profitability:
      roundScore(
        scoreProfitability(
          raw
        )
      ),

    growth:
      roundScore(
        scoreGrowth(
          raw
        )
      ),

    cashFlow:
      roundScore(
        scoreCashFlow(
          raw
        )
      ),

    capitalEfficiency:
      roundScore(
        scoreCapitalEfficiency(
          raw
        )
      ),

    earningsQuality:
      roundScore(
        scoreEarningsQuality(
          raw
        )
      )
  };


  const overallScore =
    roundScore(
      weightedAverage([
        {
          value:
            factors.financialHealth,

          weight:
            0.15
        },

        {
          value:
            factors.profitability,

          weight:
            0.20
        },

        {
          value:
            factors.growth,

          weight:
            0.20
        },

        {
          value:
            factors.cashFlow,

          weight:
            0.20
        },

        {
          value:
            factors.capitalEfficiency,

          weight:
            0.10
        },

        {
          value:
            factors.earningsQuality,

          weight:
            0.15
        }
      ])
    );


  return {
    version:
      SCORING_VERSION,

    score:
      overallScore,

    rating:
      getRating(
        overallScore
      ),

    riskLevel:
      getRiskLevel(
        factors
      ),

    dataCoverage:
      calculateCoverage(
        raw
      ),

    factors,

    rawMetrics: {
      revenueGrowthPercent:
        raw.revenueGrowthPercent,

      epsGrowthPercent:
        raw.epsGrowthPercent,

      netMarginPercent:
        raw.netMarginPercent,

      freeCashFlowMarginPercent:
        raw.freeCashFlowMarginPercent,

      returnOnEquityPercent:
        raw.returnOnEquityPercent,

      equityToAssetsPercent:
        raw.equityToAssetsPercent,

      cashToAssetsPercent:
        raw.cashToAssetsPercent,

      freeCashFlowGrowthPercent:
        raw.freeCashFlowGrowthPercent,

      operatingCashFlowToNetIncomePercent:
        raw.operatingCashFlowToNetIncomePercent,

      freeCashFlowToNetIncomePercent:
        raw.freeCashFlowToNetIncomePercent
    },

    methodology: {
      type:
        "Deterministic fundamental scoring",

      scale:
        "0-100",

      overallWeights: {
        financialHealth:
          15,

        profitability:
          20,

        growth:
          20,

        cashFlow:
          20,

        capitalEfficiency:
          10,

        earningsQuality:
          15
      },

      note:
        "Scores are deterministic and based only on supplied annual SEC fundamentals. They are not investment recommendations."
    }
  };
}
