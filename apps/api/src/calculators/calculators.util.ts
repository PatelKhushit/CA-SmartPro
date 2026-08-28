/**
 * Pure, unit-testable calculator functions. Every result includes the
 * formula used and stated assumptions so nothing is presented as a black
 * box — see spec section 28. None of these read statutory rate tables:
 * where a rate is required (tax/TDS), the caller supplies it, because this
 * system never invents or hardcodes compliance figures.
 */

export interface CalculatorOutput {
  formula: string;
  result: Record<string, number>;
  assumptions: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcPercentage(mode: 'OF' | 'IS_WHAT_PERCENT' | 'CHANGE', a: number, b: number): CalculatorOutput {
  if (mode === 'OF') {
    return {
      formula: '(percent / 100) × base',
      result: { value: round2((a / 100) * b) },
      assumptions: [`${a}% of ${b}`],
    };
  }
  if (mode === 'IS_WHAT_PERCENT') {
    if (b === 0) throw new Error('Base value cannot be zero.');
    return {
      formula: '(part / whole) × 100',
      result: { percent: round2((a / b) * 100) },
      assumptions: [`${a} as a percentage of ${b}`],
    };
  }
  if (b === 0) throw new Error('Original value cannot be zero.');
  const change = round2(((b - a) / a) * 100);
  return {
    formula: '((newValue − oldValue) / oldValue) × 100',
    result: { percentChange: change },
    assumptions: [change >= 0 ? 'Increase' : 'Decrease'],
  };
}

export function calcGst(amount: number, ratePercent: number, mode: 'EXCLUSIVE' | 'INCLUSIVE', interState: boolean): CalculatorOutput {
  let base: number;
  let gstAmount: number;
  if (mode === 'EXCLUSIVE') {
    base = amount;
    gstAmount = round2((amount * ratePercent) / 100);
  } else {
    base = round2((amount * 100) / (100 + ratePercent));
    gstAmount = round2(amount - base);
  }
  const total = round2(base + gstAmount);
  const result: Record<string, number> = { baseAmount: base, gstAmount, totalAmount: total };
  if (interState) {
    result.igst = gstAmount;
  } else {
    result.cgst = round2(gstAmount / 2);
    result.sgst = round2(gstAmount / 2);
  }
  return {
    formula:
      mode === 'EXCLUSIVE'
        ? 'GST = base × rate / 100; Total = base + GST'
        : 'base = amount × 100 / (100 + rate); GST = amount − base',
    result,
    assumptions: [
      interState ? 'Inter-state supply — IGST applies' : 'Intra-state supply — split equally as CGST + SGST',
      'Rate supplied by user; not looked up from a statutory table.',
    ],
  };
}

export function calcFlatTaxEstimate(taxableAmount: number, ratePercent: number): CalculatorOutput {
  return {
    formula: 'tax = taxableAmount × rate / 100',
    result: { taxAmount: round2((taxableAmount * ratePercent) / 100), netAmount: round2(taxableAmount * (1 - ratePercent / 100)) },
    assumptions: [
      'Flat-rate estimate only — does not apply slabs, exemptions, or surcharge/cess.',
      'Rate supplied by user; verify against current statute before filing.',
    ],
  };
}

export function calcTds(paymentAmount: number, ratePercent: number): CalculatorOutput {
  const tds = round2((paymentAmount * ratePercent) / 100);
  return {
    formula: 'TDS = payment × rate / 100; Net payable = payment − TDS',
    result: { tdsAmount: tds, netPayable: round2(paymentAmount - tds) },
    assumptions: ['Rate supplied by user for the applicable section; verify against current statute before deducting.'],
  };
}

export function calcInterest(
  principal: number,
  annualRatePercent: number,
  years: number,
  mode: 'SIMPLE' | 'COMPOUND',
  compoundingsPerYear = 1,
): CalculatorOutput {
  if (mode === 'SIMPLE') {
    const interest = round2((principal * annualRatePercent * years) / 100);
    return {
      formula: 'SI = P × R × T / 100',
      result: { interest, totalAmount: round2(principal + interest) },
      assumptions: [`Rate ${annualRatePercent}% per annum, over ${years} year(s).`],
    };
  }
  const n = compoundingsPerYear;
  const amount = principal * Math.pow(1 + annualRatePercent / 100 / n, n * years);
  return {
    formula: 'CI: A = P × (1 + R/(100×n))^(n×T)',
    result: { totalAmount: round2(amount), interest: round2(amount - principal) },
    assumptions: [`Compounded ${n} time(s) per year, rate ${annualRatePercent}% per annum, over ${years} year(s).`],
  };
}

export function calcInvoice(
  baseAmount: number,
  discountPercent: number,
  taxPercent: number,
): CalculatorOutput {
  const discount = round2((baseAmount * discountPercent) / 100);
  const taxable = round2(baseAmount - discount);
  const tax = round2((taxable * taxPercent) / 100);
  const total = round2(taxable + tax);
  return {
    formula: 'taxable = base − discount; tax = taxable × taxRate/100; total = taxable + tax',
    result: { discountAmount: discount, taxableAmount: taxable, taxAmount: tax, totalAmount: total },
    assumptions: [`Discount ${discountPercent}% applied before tax; tax rate ${taxPercent}%.`],
  };
}

export function calcDiscount(originalPrice: number, discountPercent: number): CalculatorOutput {
  const saved = round2((originalPrice * discountPercent) / 100);
  return {
    formula: 'finalPrice = original × (1 − discount/100)',
    result: { amountSaved: saved, finalPrice: round2(originalPrice - saved) },
    assumptions: [],
  };
}

export function calcProfitMargin(costPrice: number, sellingPrice: number): CalculatorOutput {
  if (sellingPrice === 0) throw new Error('Selling price cannot be zero.');
  const profit = round2(sellingPrice - costPrice);
  return {
    formula: 'margin% = (sellingPrice − costPrice) / sellingPrice × 100',
    result: { profit, marginPercent: round2((profit / sellingPrice) * 100) },
    assumptions: [],
  };
}

export function calcMarkup(costPrice: number, sellingPrice: number): CalculatorOutput {
  if (costPrice === 0) throw new Error('Cost price cannot be zero.');
  const profit = round2(sellingPrice - costPrice);
  return {
    formula: 'markup% = (sellingPrice − costPrice) / costPrice × 100',
    result: { profit, markupPercent: round2((profit / costPrice) * 100) },
    assumptions: [],
  };
}

export function calcDateDifference(startIso: string, endIso: string): CalculatorOutput {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return {
    formula: 'days = (endDate − startDate) / 1 day',
    result: {
      days,
      weeks: Math.floor(Math.abs(days) / 7) * Math.sign(days),
      approxMonths: round2(days / 30.44),
    },
    assumptions: ['Calendar-day difference; does not account for business days/holidays.'],
  };
}

export function calcDueDate(referenceIso: string, offsetDays: number): CalculatorOutput {
  const ref = new Date(referenceIso);
  const due = new Date(ref.getTime() + offsetDays * 86_400_000);
  return {
    formula: 'dueDate = referenceDate + offsetDays',
    result: { dueDateEpochMs: due.getTime() },
    assumptions: [`${offsetDays} calendar day(s) after the reference date.`],
  };
}

export function calcEmi(principal: number, annualRatePercent: number, tenureMonths: number): CalculatorOutput {
  const r = annualRatePercent / 12 / 100;
  const emi = r === 0 ? principal / tenureMonths : (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  const totalPayment = emi * tenureMonths;
  return {
    formula: 'EMI = P × r × (1+r)^n / ((1+r)^n − 1), r = monthly rate',
    result: {
      emi: round2(emi),
      totalPayment: round2(totalPayment),
      totalInterest: round2(totalPayment - principal),
    },
    assumptions: [`Monthly reducing-balance rate derived from ${annualRatePercent}% per annum over ${tenureMonths} months.`],
  };
}
