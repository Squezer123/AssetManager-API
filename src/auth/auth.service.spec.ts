import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('fake-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('rzuca ConflictException, gdy email juz istnieje', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@a.pl' });

      await expect(
        service.register({ email: 'a@a.pl', password: 'haslo123', name: 'Jan' } as any),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('tworzy usera z rola USER i zwraca token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: '1',
        email: 'nowy@a.pl',
        name: 'Jan',
        role: 'USER',
      });

      const result = await service.register({
        email: 'nowy@a.pl',
        password: 'haslo123',
        name: 'Jan',
      } as any);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'USER', email: 'nowy@a.pl' }),
        }),
      );
      expect(result.accessToken).toBe('fake-jwt-token');
      expect(result.user.role).toBe('USER');
    });
  });

  describe('login', () => {
    it('rzuca UnauthorizedException, gdy user nie istnieje', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'brak@a.pl', password: 'cokolwiek' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rzuca UnauthorizedException, gdy haslo sie nie zgadza', async () => {
      const hash = await bcrypt.hash('poprawnehaslo', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@a.pl',
        password: hash,
        role: 'USER',
      });

      await expect(
        service.login({ email: 'a@a.pl', password: 'zlehaslo' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('zwraca token, gdy dane poprawne', async () => {
      const hash = await bcrypt.hash('poprawnehaslo', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@a.pl',
        password: hash,
        role: 'USER',
      });

      const result = await service.login({
        email: 'a@a.pl',
        password: 'poprawnehaslo',
      } as any);

      expect(result.accessToken).toBe('fake-jwt-token');
    });
  });
});