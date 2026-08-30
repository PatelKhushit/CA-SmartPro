import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  roleKey!: string;
}
