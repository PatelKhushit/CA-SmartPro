import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export class CreateGstProfileDto {
  @IsString()
  clientId!: string;

  @IsString()
  @Matches(GSTIN_REGEX, { message: 'GSTIN format looks invalid.' })
  gstin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;
}

export class UpdateGstProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
