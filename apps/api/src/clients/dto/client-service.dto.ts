import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ClientServiceStatus, ServiceCategory } from '@prisma/client';

export class CreateClientServiceDto {
  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ClientServiceStatus)
  status?: ClientServiceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateClientServiceDto extends PartialType(CreateClientServiceDto) {}
