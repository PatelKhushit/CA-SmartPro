import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ItrFormType, ItrReturnStatus } from '@prisma/client';

export class CreateItrReturnDto {
  @IsString()
  clientId!: string;

  @IsString()
  @MaxLength(9)
  assessmentYear!: string;

  @IsEnum(ItrFormType)
  formType!: ItrFormType;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  reviewerUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateItrReturnDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(ItrReturnStatus)
  status?: ItrReturnStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  acknowledgementNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  demandAmount?: number;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  reviewerUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ListItrReturnsDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsEnum(ItrReturnStatus)
  status?: ItrReturnStatus;

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
