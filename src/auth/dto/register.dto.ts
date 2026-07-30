import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Podaj poprawny adres email' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Haslo musi miec co najmniej 8 znakow' })
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}
