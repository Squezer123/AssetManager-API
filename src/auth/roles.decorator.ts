import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// Uzycie: @Roles('ADMIN') nad metoda kontrolera
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
