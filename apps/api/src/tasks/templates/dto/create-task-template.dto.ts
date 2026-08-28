import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ServiceCategory, TaskCategory, TaskFrequency, TaskPriority, TemplateScope } from '@prisma/client';

export class CreateTaskTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsEnum(TaskFrequency)
  frequency!: TaskFrequency;

  @IsOptional()
  @IsEnum(TemplateScope)
  scope?: TemplateScope;

  @IsOptional()
  @IsEnum(ServiceCategory)
  applicableServiceType?: ServiceCategory;

  @IsOptional()
  @IsEnum(TaskPriority)
  defaultPriority?: TaskPriority;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  estimatedMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklistItems?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDayOfPeriod?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  leadDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
