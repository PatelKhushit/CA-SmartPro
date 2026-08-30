import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ServiceCategory, TaskPriority } from '@prisma/client';

export class CreateNoticeDto {
  @IsString()
  clientId!: string;

  @IsOptional()
  @IsEnum(ServiceCategory)
  department?: ServiceCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  noticeType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  referenceNumber!: string;

  @IsDateString()
  noticeDate!: string;

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
  @IsString()
  @MaxLength(4000)
  description?: string;
}
