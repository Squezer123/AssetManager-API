import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() sprawia, ze PrismaService jest dostepny wszedzie bez importowania
// PrismaModule w kazdym module z osobna - odpowiednik tego, ze w Next.js
// kazdy plik po prostu robi `import prisma from "@/lib/prisma"`
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
