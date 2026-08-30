import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddNoticeCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class LinkNoticeDocumentDto {
  @IsString()
  documentId!: string;
}

export class CreateNoticeTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;
}
