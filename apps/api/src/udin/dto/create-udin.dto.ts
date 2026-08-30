import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UDINDocumentType } from '@prisma/client';

export class CreateUdinDto {
  @IsString()
  clientId!: string;

  @IsOptional()
  @IsEnum(UDINDocumentType)
  documentType?: UDINDocumentType;

  @IsDateString()
  documentDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
