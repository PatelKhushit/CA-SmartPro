import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

export class CreateTdsProfileDto {
  @IsString()
  clientId!: string;

  @IsString()
  @Matches(TAN_REGEX, { message: 'TAN must look like ABCD12345E.' })
  tan!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deductorType?: string;
}

export class UpdateTdsProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deductorType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
