import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Odpowiednik `if (!session?.user) return 401` z Twoich route handlerow Next.js
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
