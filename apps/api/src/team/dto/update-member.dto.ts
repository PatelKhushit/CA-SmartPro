import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  roleKey?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
