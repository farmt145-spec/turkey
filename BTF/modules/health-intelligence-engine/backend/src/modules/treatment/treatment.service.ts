import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TreatmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async findAll(flockId?: string) {
    return this.prisma.treatment.findMany({
      where: flockId ? { flockId } : {},
      orderBy: { startDate: 'desc' }
    });
  }

  async create(dto: any, userId: string) {
    const treatment = await this.prisma.treatment.create({
      data: { ...dto, createdBy: userId }
    });
    await this.auditService.log({
      action: 'CREATE', entity: 'Treatment', entityId: treatment.id, newValue: treatment, userId
    });
    return treatment;
  }

  async update(id: string, dto: any, userId: string) {
    const existing = await this.prisma.treatment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Treatment not found');
    const updated = await this.prisma.treatment.update({ where: { id }, data: dto });
    await this.auditService.log({
      action: 'UPDATE', entity: 'Treatment', entityId: id, oldValue: existing, newValue: updated, userId
    });
    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.treatment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Treatment not found');
    await this.prisma.treatment.delete({ where: { id } });
    await this.auditService.log({
      action: 'DELETE', entity: 'Treatment', entityId: id, oldValue: existing, userId
    });
    return existing;
  }
}
