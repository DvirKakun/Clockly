import { describe, expect, it } from 'vitest';
import {
  MIXED_RATE_DISPLAY,
  SHIFT_METRICS,
  cycleShiftMetric,
  dayMetricDisplay,
  formatCompactCurrency,
  isDayRateMixed,
  parseShiftMetric,
  shiftMetricDisplay,
  shiftMetricValue,
  type ShiftMetric,
} from '../shiftMetrics';
import type { ShiftGrossResult } from '../calc/types';

function result(over: Partial<ShiftGrossResult> = {}): ShiftGrossResult {
  return {
    shiftId: 's1',
    hours: {
      totalHours: 8,
      paidBreakHours: 0,
      unpaidBreakHours: 0,
      payableHours: 8,
      isNightShift: false,
      standardDailyHours: 8.6,
      regularHours: 8,
      overtime125Hours: 0,
      overtime150Hours: 0,
      shabbatBaseHours: 0,
      shabbatOvertime175Hours: 0,
      shabbatOvertime200Hours: 0,
    },
    hourlyRateUsed: 50,
    regularPay: 400,
    overtime125Pay: 0,
    overtime150Pay: 0,
    shabbatBasePay: 0,
    shabbatOvertime175Pay: 0,
    shabbatOvertime200Pay: 0,
    bonuses: 0,
    tips: 0,
    travelReimbursement: 0,
    mealDeduction: 0,
    otherDeduction: 0,
    totalGross: 400,
    ...over,
  } as ShiftGrossResult;
}

describe('cycleShiftMetric', () => {
  it('advances through the metrics', () => {
    expect(cycleShiftMetric('pay', 1)).toBe('hours');
    expect(cycleShiftMetric('hours', 1)).toBe('extras');
    expect(cycleShiftMetric('extras', 1)).toBe('rate');
  });

  it('retreats through the metrics', () => {
    expect(cycleShiftMetric('rate', -1)).toBe('extras');
    expect(cycleShiftMetric('hours', -1)).toBe('pay');
  });

  it('wraps in both directions, so any metric is reachable from any other', () => {
    expect(cycleShiftMetric('rate', 1)).toBe('pay');
    expect(cycleShiftMetric('pay', -1)).toBe('rate');
  });

  it('returns to the starting metric after a full cycle', () => {
    let metric: ShiftMetric = 'pay';
    for (let i = 0; i < SHIFT_METRICS.length; i++) metric = cycleShiftMetric(metric, 1);
    expect(metric).toBe('pay');
  });
});

describe('parseShiftMetric', () => {
  it('accepts a known metric', () => {
    expect(parseShiftMetric('hours')).toBe('hours');
  });

  it('falls back to pay for anything unrecognised or missing', () => {
    expect(parseShiftMetric('nonsense')).toBe('pay');
    expect(parseShiftMetric(null)).toBe('pay');
    expect(parseShiftMetric('')).toBe('pay');
  });
});

describe('shiftMetricValue', () => {
  it('reads pay, hours and rate off the gross result', () => {
    const r = result({ totalGross: 512.5, hourlyRateUsed: 64 });
    expect(shiftMetricValue('pay', r)).toBe(512.5);
    expect(shiftMetricValue('hours', r)).toBe(8);
    expect(shiftMetricValue('rate', r)).toBe(64);
  });

  it('combines bonuses and tips into extras', () => {
    expect(shiftMetricValue('extras', result({ bonuses: 100, tips: 40 }))).toBe(140);
  });

  it('reports extras as zero when there are none', () => {
    expect(shiftMetricValue('extras', result())).toBe(0);
  });
});

describe('shiftMetricDisplay', () => {
  it('formats each metric with its unit', () => {
    const r = result({ totalGross: 400, hourlyRateUsed: 50, bonuses: 100, tips: 40 });
    expect(shiftMetricDisplay('pay', r)).toBe('₪400');
    expect(shiftMetricDisplay('hours', r)).toBe('8.0 שעות');
    expect(shiftMetricDisplay('extras', r)).toBe('₪140');
    expect(shiftMetricDisplay('rate', r)).toBe('₪50/שעה');
  });

  it('renders a real zero rather than a blank, so "nothing" is distinguishable from "not loaded"', () => {
    expect(shiftMetricDisplay('extras', result())).toBe('₪0');
  });

  it('never renders NaN', () => {
    const broken = result({ totalGross: NaN, hourlyRateUsed: Infinity });
    expect(shiftMetricDisplay('pay', broken)).toBe('₪0');
    expect(shiftMetricDisplay('rate', broken)).toBe('₪0/שעה');
  });
});

describe('formatCompactCurrency', () => {
  it('leaves values under a thousand as whole shekels', () => {
    expect(formatCompactCurrency(0)).toBe('₪0');
    expect(formatCompactCurrency(450)).toBe('₪450');
    expect(formatCompactCurrency(999)).toBe('₪999');
  });

  it('collapses thousands so a four-figure day fits its cell', () => {
    expect(formatCompactCurrency(1000)).toBe('₪1k');
    expect(formatCompactCurrency(1200)).toBe('₪1.2k');
    expect(formatCompactCurrency(12500)).toBe('₪12.5k');
  });

  it('rounds rather than truncating below the threshold', () => {
    expect(formatCompactCurrency(450.6)).toBe('₪451');
  });

  it('handles negatives and non-finite input', () => {
    expect(formatCompactCurrency(-450)).toBe('₪-450');
    expect(formatCompactCurrency(-1200)).toBe('₪-1.2k');
    expect(formatCompactCurrency(NaN)).toBe('₪0');
  });
});

describe('dayMetricDisplay', () => {
  it('renders nothing for a day with no shifts', () => {
    expect(dayMetricDisplay('pay', [])).toBeNull();
  });

  it('shows a single shift value', () => {
    expect(dayMetricDisplay('pay', [result({ totalGross: 400 })])).toBe('₪400');
  });

  it('sums the day rather than showing one arbitrary shift', () => {
    const day = [result({ totalGross: 400 }), result({ shiftId: 's2', totalGross: 250 })];
    expect(dayMetricDisplay('pay', day)).toBe('₪650');
  });

  it('sums hours across the day', () => {
    const day = [
      result({ hours: { ...result().hours, payableHours: 8 } }),
      result({ shiftId: 's2', hours: { ...result().hours, payableHours: 4.5 } }),
    ];
    expect(dayMetricDisplay('hours', day)).toBe('12.5');
  });

  it('sums extras across the day', () => {
    const day = [result({ bonuses: 100 }), result({ shiftId: 's2', tips: 40 })];
    expect(dayMetricDisplay('extras', day)).toBe('₪140');
  });

  it('shows the rate when a day’s shifts share one', () => {
    const day = [result({ hourlyRateUsed: 50 }), result({ shiftId: 's2', hourlyRateUsed: 50 })];
    expect(dayMetricDisplay('rate', day)).toBe('₪50');
  });

  it('will not invent a number when a day mixes rates', () => {
    const day = [result({ hourlyRateUsed: 50 }), result({ shiftId: 's2', hourlyRateUsed: 64 })];
    expect(dayMetricDisplay('rate', day)).toBe(MIXED_RATE_DISPLAY);
  });

  it('renders a zero-value day as a zero, not a blank', () => {
    expect(dayMetricDisplay('extras', [result()])).toBe('₪0');
  });
});

describe('isDayRateMixed', () => {
  it('is false for a single shift', () => {
    expect(isDayRateMixed([result()])).toBe(false);
  });

  it('is false for shifts within rounding of each other', () => {
    const day = [result({ hourlyRateUsed: 50 }), result({ shiftId: 's2', hourlyRateUsed: 50.001 })];
    expect(isDayRateMixed(day)).toBe(false);
  });

  it('is true for genuinely different rates', () => {
    const day = [result({ hourlyRateUsed: 50 }), result({ shiftId: 's2', hourlyRateUsed: 64 })];
    expect(isDayRateMixed(day)).toBe(true);
  });
});
