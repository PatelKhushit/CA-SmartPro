import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum NewsCategoryParam {
  GST = 'GST',
  TDS = 'TDS',
  INCOME_TAX = 'INCOME_TAX',
  COMPANY_LAW = 'COMPANY_LAW',
  AUDIT = 'AUDIT',
  ICAI = 'ICAI',
  OTHER = 'OTHER',
}

export class ListNewsDto {
  @IsOptional()
  @IsEnum(NewsCategoryParam)
  category?: NewsCategoryParam;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
