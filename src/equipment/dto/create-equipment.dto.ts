import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EquipmentCategory {
  LAPTOP = 'LAPTOP',
  PHONE = 'PHONE',
  CAMERA = 'CAMERA',
  OTHER = 'OTHER',
}

class LaptopSpecDto {
  @IsString() manufacturer: string;
  @IsString() cpu: string;
  @IsString() ram: string;
  @IsString() storage: string;
  @IsString() os: string;
}

class PhoneSpecDto {
  @IsString() manufacturer: string;
  @IsString() model: string;
  @IsString() storage: string;
  @IsString() os: string;
  @IsOptional() @IsString() imei?: string;
}

class CameraSpecDto {
  @IsString() manufacturer: string;
  @IsOptional() @IsString() sensorType?: string;
  @IsOptional() @IsString() resolution?: string;
  @IsOptional() @IsString() lensMount?: string;
}

export class CreateEquipmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EquipmentCategory)
  category: EquipmentCategory;

  @IsInt()
  @Min(0)
  bufferDays: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LaptopSpecDto)
  laptopSpec?: LaptopSpecDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhoneSpecDto)
  phoneSpec?: PhoneSpecDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CameraSpecDto)
  cameraSpec?: CameraSpecDto;
}
