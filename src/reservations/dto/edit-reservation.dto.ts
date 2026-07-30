import { IsDateString, IsOptional } from 'class-validator';

export class EditReservationDto {
  // startDate opcjonalny - serwis i tak honoruje go tylko gdy rezerwacja
  // jeszcze sie nie rozpoczela (faza FUTURE), dokladnie jak w Next.js
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsDateString()
  endDate: string;
}
