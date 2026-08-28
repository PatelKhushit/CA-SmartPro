import { describe, expect, it } from 'vitest';
import {
  calcDateDifference,
  calcDiscount,
  calcDueDate,
  calcEmi,
  calcFlatTaxEstimate,
  calcGst,
  calcInterest,
  calcInvoice,
  calcMarkup,
  calcPercentage,
  calcProfitMargin,
  calcTds,
} from './calculators.util.js';

describe('calculators.util', () => {
  it('percentage: A% of B', () => {
    expect(calcPercentage('OF', 10, 200).result.value).toBe(20);
  });

  it('percentage: A is what % of B', () => {
    expect(calcPercentage('IS_WHAT_PERCENT', 50, 200).result.percent).toBe(25);
  });

  it('percentage: rejects a zero base for IS_WHAT_PERCENT', () => {
    expect(() => calcPercentage('IS_WHAT_PERCENT', 50, 0)).toThrow();
  });

  it('GST exclusive splits CGST/SGST evenly for intra-state', () => {
    const out = calcGst(10000, 18, 'EXCLUSIVE', false);
    expect(out.result.gstAmount).toBe(1800);
    expect(out.result.cgst).toBe(900);
    expect(out.result.sgst).toBe(900);
    expect(out.result.totalAmount).toBe(11800);
  });

  it('GST inclusive extracts the base amount correctly', () => {
    const out = calcGst(11800, 18, 'INCLUSIVE', true);
    expect(out.result.baseAmount).toBe(10000);
    expect(out.result.igst).toBe(1800);
  });

  it('flat tax estimate computes tax and net amount', () => {
    const out = calcFlatTaxEstimate(100000, 20);
    expect(out.result.taxAmount).toBe(20000);
    expect(out.result.netAmount).toBe(80000);
  });

  it('TDS computes deduction and net payable', () => {
    const out = calcTds(50000, 10);
    expect(out.result.tdsAmount).toBe(5000);
    expect(out.result.netPayable).toBe(45000);
  });

  it('simple interest matches P*R*T/100', () => {
    const out = calcInterest(100000, 8, 2, 'SIMPLE');
    expect(out.result.interest).toBe(16000);
  });

  it('compound interest compounds correctly', () => {
    const out = calcInterest(100000, 10, 1, 'COMPOUND', 1);
    expect(out.result.totalAmount).toBe(110000);
  });

  it('invoice applies discount before tax', () => {
    const out = calcInvoice(20000, 5, 18);
    expect(out.result.discountAmount).toBe(1000);
    expect(out.result.taxableAmount).toBe(19000);
    expect(out.result.taxAmount).toBe(3420);
    expect(out.result.totalAmount).toBe(22420);
  });

  it('discount computes amount saved and final price', () => {
    const out = calcDiscount(1000, 10);
    expect(out.result.amountSaved).toBe(100);
    expect(out.result.finalPrice).toBe(900);
  });

  it('profit margin is relative to selling price', () => {
    const out = calcProfitMargin(800, 1000);
    expect(out.result.marginPercent).toBe(20);
  });

  it('markup is relative to cost price', () => {
    const out = calcMarkup(800, 1000);
    expect(out.result.markupPercent).toBe(25);
  });

  it('date difference computes whole days', () => {
    const out = calcDateDifference('2026-08-01T00:00:00.000Z', '2026-08-11T00:00:00.000Z');
    expect(out.result.days).toBe(10);
  });

  it('due date adds offset days to the reference date', () => {
    const out = calcDueDate('2026-08-01T00:00:00.000Z', 30);
    expect(new Date(out.result.dueDateEpochMs).toISOString().slice(0, 10)).toBe('2026-08-31');
  });

  it('EMI matches the standard reducing-balance formula', () => {
    const out = calcEmi(100000, 12, 12);
    // Known value for 100000 principal, 12% p.a., 12 months
    expect(out.result.emi).toBeCloseTo(8884.88, 1);
  });
});
