import { IsString } from 'class-validator';

export class FulfillDocumentRequestItemDto {
  @IsString()
  documentId!: string;
}
