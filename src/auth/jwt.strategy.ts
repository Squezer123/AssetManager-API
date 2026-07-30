import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Odpowiednik tego, co w Next.js robilo `auth()` z NextAuth - tutaj
// kazdy chroniony endpoint odczytuje token z naglowka Authorization,
// weryfikuje podpis, i wyciaga z niego { sub, email, role }.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  // To, co zwroci ta metoda, ladujue potem jako request.user
  async validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
