import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail()
  @MaxLength(180)
  email!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters.' })
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must include an uppercase letter, a lowercase letter, and a number.',
  })
  newPassword!: string;
}
