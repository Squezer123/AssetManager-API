import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}


export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferDays?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
