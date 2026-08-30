import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NoticeStatus, ServiceCategory, TaskPriority } from '@prisma/client';

export class UpdateNoticeDto {
  @IsOptional()
  @IsEnum(ServiceCategory)
  department?: ServiceCategory;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  noticeType?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  referenceNumber?: string;

  @IsOptional()
  @IsDateString()
  noticeDate?: string;

  @IsOptional()
  @IsDateString()
  responseDeadline?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}
