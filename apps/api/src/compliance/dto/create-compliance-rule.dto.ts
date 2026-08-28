import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ServiceCategory, TaskFrequency } from '@prisma/client';

export class CreateComplianceRuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @IsEnum(TaskFrequency)
  frequency!: TaskFrequency;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(31)
  dueDayOfPeriod!: number;

  @IsOptional()
  @IsEnum(ServiceCategory)
  applicableServiceType?: ServiceCategory;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  /** Where this rule's due-date logic came from — required so it's never presented as unverified fact. */
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  source!: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  sourceUrl?: string;
}
