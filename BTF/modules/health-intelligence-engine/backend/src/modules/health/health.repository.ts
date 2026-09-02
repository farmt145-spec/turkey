import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthRecord, Prisma } from '@prisma/client';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { HealthQueryDto } from './dto/health-query.dto';

@Injectable()
export class HealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateHealthRecordDto, createdBy: string): Promise<HealthRecord> {
    const { imageUrls, documentUrls, ...recordData } = data;

    return this.prisma.healthRecord.create({
      data: {
        ...recordData,
        date: new Date(recordData.date),
        createdBy,
        images: imageUrls ? {
          create: imageUrls.map(url => ({ url }))
        } : undefined,
        documents: documentUrls ? {
          create: documentUrls.map(url => ({ url, fileName: url.split('/').pop() || 'document', fileType: 'application/pdf' }))
        } : undefined,
      },
      include: {
        images: true,
        documents: true,
        flock: {
          include: {
            house: true
          }
        }
      }
    });
  }

  async findAll(query: HealthQueryDto): Promise<HealthRecord[]> {
    const where: Prisma.HealthRecordWhereInput = {};

    if (query.flockId) where.flockId = query.flockId;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.healthRecord.findMany({
      where,
      include: {
        images: true,
        documents: true,
        flock: {
          include: { house: true }
        }
      },
      orderBy: { date: 'desc' }
    });
  }

  async findOne(id: string): Promise<HealthRecord | null> {
    return this.prisma.healthRecord.findUnique({
      where: { id },
      include: {
        images: true,
        documents: true,
        flock: true
      }
    });
  }

  async update(id: string, data: Partial<CreateHealthRecordDto>): Promise<HealthRecord> {
    return this.prisma.healthRecord.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: {
        images: true,
        documents: true
      }
    });
  }

  async delete(id: string): Promise<HealthRecord> {
    return this.prisma.healthRecord.delete({
      where: { id }
    });
  }
}
