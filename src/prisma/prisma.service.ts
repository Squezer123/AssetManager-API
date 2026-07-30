import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Odpowiednik lib/prisma.js z projektu Next.js - jeden wspolny klient Prisma,
// ale tutaj DI Nesta samo pilnuje, zeby byl to singleton (bez recznego
// sprawdzania globalThis jak przy hot-reloadzie w Next.js)
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
