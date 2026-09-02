import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedAlert, AlertType, AlertSeverity, AlertStatus, Prisma } from '@prisma/client';
import { CreateAlertDto, AlertResponseDto } from '../dto/alert.dto';

@Injectable()
export class AlertService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAlertDto): Promise<FeedAlert> {
    return this.prisma.feedAlert.create({
      data: {
        type: dto.type,
        severity: dto.severity,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        title: dto.title,
        message: dto.message,
        parameter: dto.parameter,
        actualValue: dto.actualValue ? new Prisma.Decimal(dto.actualValue) : null,
        thresholdValue: dto.thresholdValue ? new Prisma.Decimal(dto.thresholdValue) : null,
        unit: dto.unit,
        consequences: dto.consequences || [],
        recommendations: dto.recommendations || [],
        status: 'ACTIVE',
      },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.FeedAlertWhereInput;
  }): Promise<AlertResponseDto[]> {
    const alerts = await this.prisma.feedAlert.findMany({
      ...params,
      orderBy: { createdAt: 'desc' },
    });
    return alerts.map(a => this.mapToDto(a));
  }

  async findBySource(sourceType: string, sourceId: string): Promise<AlertResponseDto[]> {
    const alerts = await this.prisma.feedAlert.findMany({
      where: { sourceType, sourceId, status: 'ACTIVE' },
      orderBy: { severity: 'desc' },
    });
    return alerts.map(a => this.mapToDto(a));
  }

  async acknowledge(alertId: string, userId: string): Promise<FeedAlert> {
    return this.prisma.feedAlert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  async resolve(alertId: string, userId: string): Promise<FeedAlert> {
    return this.prisma.feedAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    });
  }

  async createNutritionalAlert(
    sourceType: string,
    sourceId: string,
    parameter: string,
    actualValue: number,
    thresholdValue: number,
    unit: string,
    severity: AlertSeverity,
    consequences: string[],
    recommendations: string[],
  ): Promise<FeedAlert> {
    return this.create({
      type: AlertType.NUTRITIONAL_EXCESS,
      severity,
      sourceType,
      sourceId,
      title: `Odchylenie: ${parameter}`,
      message: `Parametr ${parameter} = ${actualValue} ${unit} przekracza limit ${thresholdValue} ${unit}.`,
      parameter,
      actualValue,
      thresholdValue,
      unit,
      consequences,
      recommendations,
    });
  }

  private mapToDto(alert: FeedAlert): AlertResponseDto {
    return {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      parameter: alert.parameter || undefined,
      actualValue: alert.actualValue ? Number(alert.actualValue) : undefined,
      thresholdValue: alert.thresholdValue ? Number(alert.thresholdValue) : undefined,
      unit: alert.unit || undefined,
      consequences: alert.consequences as string[],
      recommendations: alert.recommendations as string[],
      status: alert.status,
      createdAt: alert.createdAt,
    };
  }
}
