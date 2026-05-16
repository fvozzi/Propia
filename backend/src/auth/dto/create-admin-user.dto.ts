import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { AppUserRole } from '../../common/enums';

export class CreateAdminUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(AppUserRole)
  appRole: AppUserRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  activeTeamId?: number;
}
