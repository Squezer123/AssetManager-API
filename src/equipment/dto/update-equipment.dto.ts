import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}

// Aktualizacja jest celowo "plaska" (bez zagniezdzonych spec) - edycja
// specyfikacji technicznej to osobna operacja (PATCH /equipment/:id/spec),
// zeby nie mieszac zmiany statusu z edycja np. CPU laptopa w jednym DTO
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
