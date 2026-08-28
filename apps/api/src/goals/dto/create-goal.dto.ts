import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { GoalType, GoalUnit } from '@prisma/client';

export class CreateGoalDto {
  @IsEnum(GoalType)
  type!: GoalType;

  @IsOptional()
  @IsEnum(GoalUnit)
  unit?: GoalUnit;

  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  targetValue!: number;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  /** If false, this is a firm-wide goal (userId = null). Defaults to true (personal). */
  @IsOptional()
  @IsBoolean()
  personal?: boolean;
}
