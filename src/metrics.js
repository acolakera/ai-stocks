/* =========================================
   NUMBER HELPERS
   ========================================= */

function toFiniteNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


function percentageRatio(
  numerator,
  denominator
) {
  const numeratorValue =
    toFiniteNumber(numerator);

  const denominatorValue =
    toFiniteNumber(denominator);


  if (
    numeratorValue === null ||
    denominatorValue === null ||
    denominatorValue === 0
  ) {
    return null;
  }


  return (
    numeratorValue /
    denominatorValue
  ) * 100;
}


function percentageGrowth(
  currentValue,
  previousValue
) {
  const current =
    toFiniteNumber(currentValue);

  const previous =
    toFiniteNumber(previousValue);


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
   FACT VALUE HELPER
   ========================================= */

function factValue(fact) {
  return toFiniteNumber(
    fact?.value
  );
}


/* =========================================
   DERIVED FINANCIAL METRICS
   ========================================= */

export function buildDerivedMetrics(
  current,
  previous
) {
  if (!current) {
    return null;
  }


  const currentRevenue =
    factValue(
      current.revenue
    );

  const previousRevenue =
    factValue(
      previous?.revenue
    );


  const currentEPS =
    factValue(
      current.dilutedEPS
    );

  const previousEPS =
    factValue(
      previous?.dilutedEPS
    );


  const netIncome =
    factValue(
      current.netIncome
    );


  const freeCashFlow =
    factValue(
      current.freeCashFlow
    );


  const currentEquity =
    factValue(
      current.equity
    );

  const previousEquity =
    factValue(
      previous?.equity
    );


  const revenueGrowth =
    percentageGrowth(
      currentRevenue,
      previousRevenue
    );


  const epsGrowth =
    percentageGrowth(
      currentEPS,
      previousEPS
    );


  const netMargin =
    percentageRatio(
      netIncome,
      currentRevenue
    );


  const freeCashFlowMargin =
    percentageRatio(
      freeCashFlow,
      currentRevenue
    );


  let averageEquity =
    null;

  let returnOnEquity =
    null;


  if (
    currentEquity !== null &&
    previousEquity !== null
  ) {
    averageEquity =
      (
        currentEquity +
        previousEquity
      ) / 2;


    returnOnEquity =
      percentageRatio(
        netIncome,
        averageEquity
      );
  }


  return {
    revenueGrowth: {
      value:
        revenueGrowth,

      unit:
        "percent",

      formula:
        "(Current Revenue / Previous Revenue - 1) × 100"
    },


    epsGrowth: {
      value:
        epsGrowth,

      unit:
        "percent",

      formula:
        "(Current Diluted EPS / Previous Diluted EPS - 1) × 100"
    },


    netMargin: {
      value:
        netMargin,

      unit:
        "percent",

      formula:
        "Net Income / Revenue × 100"
    },


    freeCashFlowMargin: {
      value:
        freeCashFlowMargin,

      unit:
        "percent",

      formula:
        "Free Cash Flow / Revenue × 100"
    },


    returnOnEquity: {
      value:
        returnOnEquity,

      unit:
        "percent",

      formula:
        "Net Income / Average Shareholders' Equity × 100"
    },


    averageEquity: {
      value:
        averageEquity,

      unit:
        "USD",

      formula:
        "(Current Equity + Previous Equity) / 2"
    }
  };
}
