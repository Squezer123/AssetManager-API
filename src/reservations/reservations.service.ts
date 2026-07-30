import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { EditReservationDto } from './dto/edit-reservation.dto';

const BUSINESS_HOUR_START = 8;
const BUSINESS_HOUR_END = 18;

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getPhase(reservation: { status: string; startDate: Date }) {
  if (reservation.status !== 'ACTIVE') return 'CLOSED';
  if (new Date(reservation.startDate) > new Date()) return 'FUTURE';
  return 'IN_PROGRESS';
}

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  // --- Odczyt ---

  findAllForUser(userId: string) {
    return this.prisma.reservation.findMany({
      where: { userId },
      include: { equipment: true },
      orderBy: { startDate: 'desc' },
    });
  }

  findAllAdmin() {
    return this.prisma.reservation.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        equipment: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  // --- Tworzenie (odpowiednik POST /api/reservations) ---

  async create(dto: CreateReservationDto, userId: string) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: dto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException('Sprzet nie znaleziony');
    }

    if (equipment.status !== 'AVAILABLE') {
      throw new ConflictException(
        `Sprzet nie jest dostepny (status: ${equipment.status})`,
      );
    }

    const isHourlyMode = equipment.bufferDays === 0;
    const { startDate, endDate } = this.validateReservationDates(
      new Date(dto.startDate),
      new Date(dto.endDate),
      isHourlyMode,
    );

    await this.assertNoCollision(equipment, startDate, endDate);

    return this.prisma.reservation.create({
      data: {
        userId,
        equipmentId: equipment.id,
        startDate,
        endDate,
        status: 'ACTIVE',
      },
      include: { equipment: true },
    });
  }

  // --- Anulowanie / edycja / zwrot (odpowiednik PATCH /api/reservations/[id]) ---

  async cancel(id: string, userId: string, isAdmin: boolean) {
    const reservation = await this.getOwnedOrAdmin(id, userId, isAdmin);
    const phase = getPhase(reservation);

    if (phase === 'CLOSED') {
      throw new ConflictException('Ta rezerwacja jest juz zamknieta');
    }
    if (phase === 'IN_PROGRESS') {
      throw new ConflictException(
        'Nie mozna anulowac rezerwacji, ktora juz sie rozpoczela',
      );
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: userId },
    });
  }

  async markReturned(id: string, userId: string, isAdmin: boolean) {
    const reservation = await this.getOwnedOrAdmin(id, userId, isAdmin);
    const phase = getPhase(reservation);

    if (phase === 'CLOSED') {
      throw new ConflictException('Ta rezerwacja jest juz zamknieta');
    }
    if (phase === 'FUTURE') {
      throw new ConflictException(
        'Nie mozna oznaczyc zwrotu przed rozpoczeciem rezerwacji',
      );
    }

    const now = new Date();
    // Jesli zwrot nastapil przed planowanym koncem, endDate skraca sie do
    // rzeczywistego momentu zwrotu - tak samo jak w Next.js route handlerze
    const actualEnd = now < new Date(reservation.endDate) ? now : reservation.endDate;

    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'RETURNED', returnedAt: now, endDate: actualEnd },
    });
  }

  async edit(id: string, dto: EditReservationDto, userId: string, isAdmin: boolean) {
    const reservation = await this.getOwnedOrAdmin(id, userId, isAdmin, {
      include: { equipment: true },
    });
    const phase = getPhase(reservation);

    if (phase === 'CLOSED') {
      throw new ConflictException('Ta rezerwacja jest juz zamknieta');
    }

    const newEnd = new Date(dto.endDate);
    if (isNaN(newEnd.getTime())) {
      throw new BadRequestException('Pole "endDate" musi byc poprawna data');
    }

    let newStart: Date;

    if (phase === 'IN_PROGRESS') {
      // W trakcie: start zostaje, koniec mozna tylko wydluzyc
      newStart = new Date(reservation.startDate);
      if (newEnd <= new Date(reservation.endDate)) {
        throw new BadRequestException(
          'Nowa data konca moze byc tylko wydluzona, nie skrocona',
        );
      }
    } else {
      // FUTURE: pelna edycja zakresu
      newStart = dto.startDate ? new Date(dto.startDate) : new Date(reservation.startDate);

      if (isNaN(newStart.getTime())) {
        throw new BadRequestException('Pole "startDate" musi byc poprawna data');
      }
      if (newStart < new Date()) {
        throw new BadRequestException('Data rozpoczecia nie moze byc w przeszlosci');
      }
      if (newEnd <= newStart) {
        throw new BadRequestException(
          'Data zakonczenia musi byc pozniejsza niz data rozpoczecia',
        );
      }
    }

    await this.assertNoCollision(reservation.equipment, newStart, newEnd, id);

    return this.prisma.reservation.update({
      where: { id },
      data: { startDate: newStart, endDate: newEnd },
    });
  }

  // --- Usuwanie calkowite (odpowiednik DELETE /api/reservations/[id], admin-only) ---

  async remove(id: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException('Rezerwacja nie znaleziona');
    }

    await this.prisma.reservation.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Prywatne helpery ---

  private async getOwnedOrAdmin(
    id: string,
    userId: string,
    isAdmin: boolean,
    extraArgs: Record<string, unknown> = {},
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      ...extraArgs,
    });

    if (!reservation) {
      throw new NotFoundException('Rezerwacja nie znaleziona');
    }

    if (reservation.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Brak dostepu do tej rezerwacji');
    }

    return reservation;
  }

  // Odpowiednik validateDailyReservationInput / validateHourlyReservationInput z Next.js
  private validateReservationDates(startDate: Date, endDate: Date, isHourlyMode: boolean) {
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Pola "startDate" i "endDate" musza byc poprawnymi datami');
    }

    if (!isHourlyMode) {
      const start = startOfDay(startDate);
      const end = startOfDay(endDate);
      const today = startOfDay(new Date());

      if (start < today) {
        throw new BadRequestException('Data rozpoczecia nie moze byc w przeszlosci');
      }
      if (end < start) {
        throw new BadRequestException(
          'Data zakonczenia nie moze byc wczesniejsza niz data rozpoczecia',
        );
      }

      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 30) {
        throw new BadRequestException('Rezerwacja nie moze przekraczac 30 dni');
      }

      return { startDate: start, endDate: end };
    }

    // Tryb godzinowy
    const now = new Date();
    if (startDate < now) {
      throw new BadRequestException('Wybrany termin jest w przeszlosci');
    }
    if (endDate <= startDate) {
      throw new BadRequestException(
        'Godzina zakonczenia musi byc pozniejsza niz godzina rozpoczecia',
      );
    }

    const sameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate();
    if (!sameDay) {
      throw new BadRequestException('Rezerwacja godzinowa musi miescic sie w obrebie jednego dnia');
    }

    const isWholeHour = (d: Date) => d.getMinutes() === 0 && d.getSeconds() === 0;
    if (!isWholeHour(startDate) || !isWholeHour(endDate)) {
      throw new BadRequestException('Godziny rezerwacji musza zaczynac sie o pelnej godzinie');
    }

    if (
      startDate.getHours() < BUSINESS_HOUR_START ||
      endDate.getHours() > BUSINESS_HOUR_END ||
      (endDate.getHours() === BUSINESS_HOUR_END && endDate.getMinutes() > 0)
    ) {
      throw new BadRequestException(
        `Rezerwacja musi miescic sie w godzinach ${BUSINESS_HOUR_START}:00-${BUSINESS_HOUR_END}:00`,
      );
    }

    const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    if (diffHours < 1) {
      throw new BadRequestException('Minimalny czas rezerwacji to 1 godzina');
    }

    return { startDate, endDate };
  }

  // Odpowiednik zapytania kolizyjnego z route.js - z opcjonalnym wykluczeniem
  // wlasnego id (potrzebne przy edycji, zeby rezerwacja nie "kolidowala sama ze soba")
  private async assertNoCollision(
    equipment: { id: string; bufferDays: number },
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ) {
    const isHourlyMode = equipment.bufferDays === 0;

    const baseWhere: any = {
      equipmentId: equipment.id,
      status: 'ACTIVE',
      ...(excludeId ? { id: { not: excludeId } } : {}),
    };

    let overlapping;

    if (isHourlyMode) {
      overlapping = await this.prisma.reservation.findFirst({
        where: {
          ...baseWhere,
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });
    } else {
      const bufferMs = equipment.bufferDays * 24 * 60 * 60 * 1000;
      const rangeStart = new Date(startDate.getTime() - bufferMs);
      const rangeEnd = new Date(endDate.getTime() + bufferMs);

      overlapping = await this.prisma.reservation.findFirst({
        where: {
          ...baseWhere,
          startDate: { lte: rangeEnd },
          endDate: { gte: rangeStart },
        },
      });
    }

    if (overlapping) {
      throw new ConflictException('Sprzet jest juz zarezerwowany w tym terminie');
    }
  }
}
