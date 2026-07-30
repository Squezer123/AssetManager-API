import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Odpowiednik `session.user` w Twoim Home (app/page.js) - dane profilu
  // zalogowanego usera, do wyswietlenia "Witaj, ..."
  @Get('me')
  me(@Req() req) {
    return this.usersService.findById(req.user.id);
  }
}
