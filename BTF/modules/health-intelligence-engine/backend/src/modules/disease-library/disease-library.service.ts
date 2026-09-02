import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DiseaseLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.disease.findMany({
      include: { images: true, references: true },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const disease = await this.prisma.disease.findUnique({
      where: { id },
      include: { images: true, references: true }
    });
    if (!disease) throw new NotFoundException('Disease not found');
    return disease;
  }

  async create(dto: any) {
    return this.prisma.disease.create({
      data: dto,
      include: { images: true }
    });
  }
}
