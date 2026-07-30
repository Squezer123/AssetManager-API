import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = 'e2e-test-auth@example.com';
  const testPassword = 'haslo12345';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('rejestruje nowego uzytkownika i zwraca token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword, name: 'E2E Test' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.role).toBe('USER');
    });

    it('odrzuca rejestracje z zajetym emailem (409)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword, name: 'E2E Test' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword, name: 'Inny' })
        .expect(409);
    });

    it('odrzuca niepoprawny email (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'to-nie-jest-email', password: testPassword })
        .expect(400);
    });

    it('odrzuca za krotkie haslo (400)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: 'krotkie' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword, name: 'E2E Test' });
    });

    it('loguje z poprawnymi danymi i zwraca token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
    });

    it('odrzuca zle haslo (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'zlehaslo' })
        .expect(401);
    });

    it('odrzuca nieistniejacy email (401)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nieistnieje@example.com', password: testPassword })
        .expect(401);
    });
  });
});