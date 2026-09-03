import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ComplianceWorkStatus, RocFormType } from '@prisma/client';

export class CreateRocFilingDto {
  @IsString()
  clientId!: string;

  @IsEnum(RocFormType)
  formType!: RocFormType;

  @IsString()
  @MaxLength(9)
  financialYear!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateRocFilingDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(ComplianceWorkStatus)
  status?: ComplianceWorkStatus;

  @IsOptional()
  @IsDateString()
  filingDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  srn?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ListRocFilingsDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsEnum(ComplianceWorkStatus)
  status?: ComplianceWorkStatus;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

export class CreateFilingTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;
}

export class CreateFilingReminderDto {
  @IsDateString()
  scheduledAt!: string;
}

export class CreateFilingDocumentRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
