import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, Min } from 'class-validator';

export class PercentageDto {
  @IsEnum(['OF', 'IS_WHAT_PERCENT', 'CHANGE'])
  mode!: 'OF' | 'IS_WHAT_PERCENT' | 'CHANGE';

  @IsNumber()
  a!: number;

  @IsNumber()
  b!: number;
}

export class GstDto {
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsNumber()
  @Min(0)
  ratePercent!: number;

  @IsEnum(['EXCLUSIVE', 'INCLUSIVE'])
  mode!: 'EXCLUSIVE' | 'INCLUSIVE';

  @IsBoolean()
  interState!: boolean;
}

export class FlatRateDto {
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsNumber()
  @Min(0)
  ratePercent!: number;
}

export class InterestDto {
  @IsNumber()
  @Min(0)
  principal!: number;

  @IsNumber()
  @Min(0)
  annualRatePercent!: number;

  @IsNumber()
  @Min(0)
  years!: number;

  @IsEnum(['SIMPLE', 'COMPOUND'])
  mode!: 'SIMPLE' | 'COMPOUND';

  @IsInt()
  @Min(1)
  compoundingsPerYear: number = 1;
}

export class InvoiceDto {
  @IsNumber()
  @Min(0)
  baseAmount!: number;

  @IsNumber()
  @Min(0)
  discountPercent: number = 0;

  @IsNumber()
  @Min(0)
  taxPercent: number = 0;
}

export class DiscountDto {
  @IsNumber()
  @Min(0)
  originalPrice!: number;

  @IsNumber()
  @Min(0)
  discountPercent!: number;
}

export class PriceCompareDto {
  @IsNumber()
  @Min(0)
  costPrice!: number;

  @IsNumber()
  @Min(0)
  sellingPrice!: number;
}

export class DateDifferenceDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class DueDateDto {
  @IsDateString()
  referenceDate!: string;

  @IsInt()
  offsetDays!: number;
}

export class EmiDto {
  @IsNumber()
  @Min(0)
  principal!: number;

  @IsNumber()
  @Min(0)
  annualRatePercent!: number;

  @IsInt()
  @Min(1)
  tenureMonths!: number;
}
