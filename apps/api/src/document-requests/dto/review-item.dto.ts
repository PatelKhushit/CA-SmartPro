import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentRequestItemStatus } from '@prisma/client';

export class ReviewDocumentRequestItemDto {
  // UPLOADED is set only via the fulfill endpoint (it always carries a
  // documentId); the service rejects that value here.
  @IsEnum(DocumentRequestItemStatus)
  status!: DocumentRequestItemStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
