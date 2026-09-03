import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LeaveRequestStatus, LeaveType } from '@prisma/client';

export class CreateLeaveRequestDto {
  @IsEnum(LeaveType)
  leaveType!: LeaveType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsNumber()
  @Min(0.5)
  @Max(365)
  days!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ReviewLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;
}

export class ListLeaveRequestsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(LeaveRequestStatus)
  status?: LeaveRequestStatus;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number = 50;
}
