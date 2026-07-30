import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

// Odpowiednik: `if (session.user.role !== "ADMIN") return 403`
// powtarzanego w kazdym Twoim route handlerze w Next.js - tutaj to jedna
// wspolna warstwa, ktora sama sprawdza wymagana role z dekoratora @Roles(...)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // brak dekoratora @Roles -> kazdy zalogowany user moze wejsc
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Brak wymaganych uprawnien');
    }

    return true;
  }
}
