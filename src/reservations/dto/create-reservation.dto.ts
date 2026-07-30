import { IsDateString, IsString } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  equipmentId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
