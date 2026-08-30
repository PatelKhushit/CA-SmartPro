import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AiMessageSource } from '@prisma/client';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string;

  @IsOptional()
  @IsEnum(AiMessageSource)
  source?: AiMessageSource;
}
