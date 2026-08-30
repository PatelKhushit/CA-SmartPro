import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ComplianceWorkStatus, GstReturnType } from '@prisma/client';

export class CreateGstReturnDto {
  @IsString()
  gstProfileId!: string;

  @IsEnum(GstReturnType)
  returnType!: GstReturnType;

  @IsString()
  @MaxLength(20)
  taxPeriod!: string;

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

export class UpdateGstReturnDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(ComplianceWorkStatus)
  status?: ComplianceWorkStatus;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ListGstReturnsDto {
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

export class CreateReturnTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;
}

export class CreateReturnReminderDto {
  @IsDateString()
  scheduledAt!: string;
}

export class CreateReturnDocumentRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
