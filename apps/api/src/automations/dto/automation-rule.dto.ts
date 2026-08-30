import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AutomationTriggerType } from '@prisma/client';

export class CreateAutomationRuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(AutomationTriggerType)
  triggerType!: AutomationTriggerType;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  conditions?: unknown[];

  @IsArray()
  actions!: unknown[];
}

export class UpdateAutomationRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  conditions?: unknown[];

  @IsOptional()
  @IsArray()
  actions?: unknown[];

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
