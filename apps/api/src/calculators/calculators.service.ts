import { Injectable } from '@nestjs/common';
import { ApiError } from '../common/errors/api-error.js';
import { HttpStatus } from '@nestjs/common';
import * as calc from './calculators.util.js';
import type { CalculatorOutput } from './calculators.util.js';

export interface CalculatorResponse extends CalculatorOutput {
  inputs: Record<string, unknown>;
  calculatedAt: string;
}

@Injectable()
export class CalculatorsService {
  private wrap(inputs: Record<string, unknown>, fn: () => CalculatorOutput): CalculatorResponse {
    try {
      const output = fn();
      return { inputs, ...output, calculatedAt: new Date().toISOString() };
    } catch (err) {
      throw new ApiError('INVALID_CALCULATOR_INPUT', err instanceof Error ? err.message : 'Invalid input.', HttpStatus.BAD_REQUEST);
    }
  }

  percentage(dto: { mode: 'OF' | 'IS_WHAT_PERCENT' | 'CHANGE'; a: number; b: number }) {
    return this.wrap(dto, () => calc.calcPercentage(dto.mode, dto.a, dto.b));
  }

  gst(dto: { amount: number; ratePercent: number; mode: 'EXCLUSIVE' | 'INCLUSIVE'; interState: boolean }) {
    return this.wrap(dto, () => calc.calcGst(dto.amount, dto.ratePercent, dto.mode, dto.interState));
  }

  tax(dto: { amount: number; ratePercent: number }) {
    return this.wrap(dto, () => calc.calcFlatTaxEstimate(dto.amount, dto.ratePercent));
  }

  tds(dto: { amount: number; ratePercent: number }) {
    return this.wrap(dto, () => calc.calcTds(dto.amount, dto.ratePercent));
  }

  interest(dto: {
    principal: number;
    annualRatePercent: number;
    years: number;
    mode: 'SIMPLE' | 'COMPOUND';
    compoundingsPerYear: number;
  }) {
    return this.wrap(dto, () =>
      calc.calcInterest(dto.principal, dto.annualRatePercent, dto.years, dto.mode, dto.compoundingsPerYear),
    );
  }

  invoice(dto: { baseAmount: number; discountPercent: number; taxPercent: number }) {
    return this.wrap(dto, () => calc.calcInvoice(dto.baseAmount, dto.discountPercent, dto.taxPercent));
  }

  discount(dto: { originalPrice: number; discountPercent: number }) {
    return this.wrap(dto, () => calc.calcDiscount(dto.originalPrice, dto.discountPercent));
  }

  profitMargin(dto: { costPrice: number; sellingPrice: number }) {
    return this.wrap(dto, () => calc.calcProfitMargin(dto.costPrice, dto.sellingPrice));
  }

  markup(dto: { costPrice: number; sellingPrice: number }) {
    return this.wrap(dto, () => calc.calcMarkup(dto.costPrice, dto.sellingPrice));
  }

  dateDifference(dto: { startDate: string; endDate: string }) {
    return this.wrap(dto, () => calc.calcDateDifference(dto.startDate, dto.endDate));
  }

  dueDate(dto: { referenceDate: string; offsetDays: number }) {
    return this.wrap(dto, () => calc.calcDueDate(dto.referenceDate, dto.offsetDays));
  }

  emi(dto: { principal: number; annualRatePercent: number; tenureMonths: number }) {
    return this.wrap(dto, () => calc.calcEmi(dto.principal, dto.annualRatePercent, dto.tenureMonths));
  }
}
