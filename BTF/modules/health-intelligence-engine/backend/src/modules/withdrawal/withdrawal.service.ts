import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WithdrawalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(flockId?: string) {
    return this.prisma.withdrawalPeriod.findMany({
      where: flockId ? { flockId } : {},
      orderBy: { endDate: 'desc' }
    });
  }

  async calculateWithdrawal(treatmentId: string) {
    const treatment = await this.prisma.treatment.findUnique({
      where: { id: treatmentId },
      include: { flock: true }
    });

    if (!treatment) throw new Error('Treatment not found');

    const endDate = treatment.endDate || treatment.startDate;
    const withdrawalEnd = new Date(endDate);
    withdrawalEnd.setDate(withdrawalEnd.getDate() + treatment.withdrawalDays);

    const now = new Date();
    const daysRemaining = Math.ceil((withdrawalEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const blocksSale = daysRemaining > 0;

    const withdrawal = await this.prisma.withdrawalPeriod.create({
      data: {
        flockId: treatment.flockId,
        treatmentId: treatment.id,
        substanceName: treatment.activeSubstance,
        startDate: endDate,
        endDate: withdrawalEnd,
        isActive: blocksSale,
        blocksSale
      }
    });

    return {
      ...withdrawal,
      daysRemaining: Math.max(0, daysRemaining),
      canSell: !blocksSale,
      message: blocksSale 
        ? `SPRZEDAŻ ZABLOKOWANA do ${withdrawalEnd.toISOString().split('T')[0]} (${daysRemaining} dni karencji)`
        : 'Karencja zakończona — stado można sprzedać'
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async checkWithdrawalPeriods(): Promise<void> {
    const activePeriods = await this.prisma.withdrawalPeriod.findMany({
      where: { isActive: true, warningSent: false },
      include: { flock: true }
    });

    for (const period of activePeriods) {
      const daysRemaining = Math.ceil(
        (period.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysRemaining <= 3 && daysRemaining > 0) {
        await this.prisma.withdrawalPeriod.update({
          where: { id: period.id },
          data: { warningSent: true }
        });
      }

      if (daysRemaining <= 0) {
        await this.prisma.withdrawalPeriod.update({
          where: { id: period.id },
          data: { isActive: false, blocksSale: false }
        });
      }
    }
  }
}
