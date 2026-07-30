import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

const SPEC_FIELD_BY_CATEGORY = {
  LAPTOP: 'laptopSpec',
  PHONE: 'phoneSpec',
  CAMERA: 'cameraSpec',
  OTHER: null,
};

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.equipment.findMany({
      include: {

        reservations: {
          where: {
            status: 'ACTIVE',
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        laptopSpec: true,
        phoneSpec: true,
        cameraSpec: true,
        reservations: { orderBy: { startDate: 'desc' } },
      },
    });

    if (!equipment) {
      throw new NotFoundException('Sprzet nie znaleziony');
    }

    return equipment;
  }

  async create(dto: CreateEquipmentDto) {
    const expectedSpecField = SPEC_FIELD_BY_CATEGORY[dto.category];

    if (expectedSpecField) {
      const providedSpec = dto[expectedSpecField];
      if (!providedSpec) {
        throw new BadRequestException(
          `Kategoria ${dto.category} wymaga pola "${expectedSpecField}"`,
        );
      }
    }

    const { laptopSpec, phoneSpec, cameraSpec, ...equipmentData } = dto;

    return this.prisma.equipment.create({
      data: {
        ...equipmentData,
        ...(dto.category === 'LAPTOP' && laptopSpec
          ? { laptopSpec: { create: laptopSpec } }
          : {}),
        ...(dto.category === 'PHONE' && phoneSpec
          ? { phoneSpec: { create: phoneSpec } }
          : {}),
        ...(dto.category === 'CAMERA' && cameraSpec
          ? { cameraSpec: { create: cameraSpec } }
          : {}),
      },
      include: { laptopSpec: true, phoneSpec: true, cameraSpec: true },
    });
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    await this.findOne(id); 

    return this.prisma.equipment.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);


    return this.prisma.equipment.delete({ where: { id } });
  }
}
