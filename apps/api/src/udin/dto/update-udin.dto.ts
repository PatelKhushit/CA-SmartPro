import { IsDateString, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { UDINDocumentType, UDINStatus } from '@prisma/client';

// Light shape check only (ICAI UDIN is an 18-character alphanumeric code) —
// this firm records the UDIN the CA generated on the ICAI portal, it never
// generates or validates a real checksum itself.
const UDIN_SHAPE = /^[A-Z0-9]{10,20}$/;

export class UpdateUdinDto {
  @IsOptional()
  @IsEnum(UDINDocumentType)
  documentType?: UDINDocumentType;

  @IsOptional()
  @IsDateString()
  documentDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(UDIN_SHAPE, { message: 'UDIN should be the 18-character code from the ICAI portal.' })
  udinNumber?: string;

  @IsOptional()
  @IsDateString()
  generatedDate?: string;

  @IsOptional()
  @IsEnum(UDINStatus)
  status?: UDINStatus;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
