import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Globalna walidacja DTO (class-validator) na kazdym endpoincie
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // usuwa pola spoza DTO zamiast je przepuszczac
      forbidNonWhitelisted: false,
      transform: true, // zamienia np. stringi z query na liczby/daty wg typu w DTO
    }),
  );

  // CORS - frontend Next.js stoi na innym porcie (3000 vs 3001), wiec trzeba to jawnie zezwolic
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend NestJS dziala na porcie ${port}`);
}
bootstrap();
