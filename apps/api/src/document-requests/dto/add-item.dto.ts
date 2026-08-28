import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddDocumentRequestItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label!: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
