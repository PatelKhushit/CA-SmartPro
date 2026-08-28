import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TaskStatus } from '@prisma/client';
import { CreateTaskDto } from './create-task.dto.js';

export class UpdateTaskDto extends PartialType(OmitType(CreateTaskDto, ['checklistItems'] as const)) {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  /** Actual time spent, in minutes — set from the Focus Mode timer on completion. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  actualMinutes?: number;
}
