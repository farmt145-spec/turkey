import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VaccinationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(flockId?: string) {
    return this.prisma.vaccination.findMany({
      where: flockId ? { flockId } : {},
      include: { flock: { include: { house: true } }, program: true },
      orderBy: { scheduledDate: 'asc' }
    });
  }

  async create(dto: any) {
    return this.prisma.vaccination.create({
      data: dto,
      include: { flock: true }
    });
  }

  async update(id: string, dto: any) {
    return this.prisma.vaccination.update({
      where: { id },
      data: dto
    });
  }
}
