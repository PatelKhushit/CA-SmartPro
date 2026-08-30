import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { TdsCertificateType, TdsChallanStatus, TdsCertificateStatus } from '@prisma/client';

export class CreateChallanDto {
  @IsString()
  tdsProfileId!: string;

  @IsString()
  @MaxLength(60)
  challanNumber!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  section?: string;
}

export class UpdateChallanDto {
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsEnum(TdsChallanStatus)
  status?: TdsChallanStatus;
}

export class CreateCertificateDto {
  @IsString()
  tdsProfileId!: string;

  @IsEnum(TdsCertificateType)
  certificateType!: TdsCertificateType;

  @IsString()
  @MaxLength(20)
  quarter!: string;
}

export class UpdateCertificateDto {
  @IsOptional()
  @IsEnum(TdsCertificateStatus)
  status?: TdsCertificateStatus;

  @IsOptional()
  @IsDateString()
  issuedDate?: string;
}
