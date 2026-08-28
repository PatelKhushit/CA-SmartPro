import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

export class RescheduleTaskDto {
  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AssignTaskDto {
  @IsString()
  assignedUserId!: string;
}
