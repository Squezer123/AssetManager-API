import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { EditReservationDto } from './dto/edit-reservation.dto';

@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Get('me')
  findMine(@Req() req) {
    return this.reservationsService.findAllForUser(req.user.id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.reservationsService.findAllAdmin();
  }

  @Post()
  create(@Body() dto: CreateReservationDto, @Req() req) {
    return this.reservationsService.create(dto, req.user.id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Req() req) {
    return this.reservationsService.cancel(id, req.user.id, req.user.role === 'ADMIN');
  }

  @Patch(':id/return')
  markReturned(@Param('id') id: string, @Req() req) {
    return this.reservationsService.markReturned(
      id,
      req.user.id,
      req.user.role === 'ADMIN',
    );
  }

  @Patch(':id')
  edit(@Param('id') id: string, @Body() dto: EditReservationDto, @Req() req) {
    return this.reservationsService.edit(id, dto, req.user.id, req.user.role === 'ADMIN');
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(id);
  }
}
