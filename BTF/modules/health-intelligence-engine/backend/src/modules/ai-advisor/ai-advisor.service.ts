import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIAdvisorRequestDto } from './dto/ai-advisor-request.dto';

export interface DiseasePrediction {
  diseaseId: string;
  diseaseName: string;
  probability: number;
  possibleCauses: string[];
  recommendedTests: string[];
  immediateActions: string[];
  productionImpact: string;
  disclaimer: string;
}

@Injectable()
export class AIAdvisorService {
  constructor(private readonly prisma: PrismaService) {}

  async analyze(dto: AIAdvisorRequestDto, veterinarianId: string): Promise<DiseasePrediction[]> {
    const flock = await this.prisma.flock.findUnique({
      where: { id: dto.flockId },
      include: {
        dailyMetrics: { orderBy: { date: 'desc' }, take: 7 },
        treatments: { orderBy: { startDate: 'desc' }, take: 5 },
        healthRecords: { orderBy: { date: 'desc' }, take: 10 }
      }
    });

    if (!flock) throw new Error('Flock not found');

    const diseases = await this.prisma.disease.findMany();
    const predictions = this.runInference(dto, flock, diseases);

    await this.prisma.aIAdvisorLog.create({
      data: {
        flockId: dto.flockId,
        symptoms: dto.symptoms,
        inputData: dto as any,
        recommendations: predictions as any,
        confidence: predictions[0]?.probability,
        veterinarianId,
        disclaimerShown: true
      }
    });

    return predictions;
  }

  private runInference(dto: AIAdvisorRequestDto, flock: any, diseases: any[]): DiseasePrediction[] {
    const predictions: DiseasePrediction[] = [];
    const age = flock.ageDays;

    for (const disease of diseases) {
      let score = 0;
      let maxScore = 0;

      const symptomMatches = dto.symptoms.filter(s => 
        disease.symptoms.some(ds => ds.toLowerCase().includes(s.toLowerCase()))
      );
      score += symptomMatches.length * 25;
      maxScore += dto.symptoms.length * 25;

      if (disease.name.includes('Newcastle') && age < 21) score += 15;
      if (disease.name.includes('Coccidiosis') && (age >= 14 && age <= 28)) score += 20;
      if (disease.name.includes('Ascites') && age > 35) score += 15;

      if (dto.nh3 && dto.nh3 > 25) score += 10;
      if (dto.co2 && dto.co2 > 3000) score += 10;
      if (dto.temperature && dto.temperature > 28) score += 5;

      if (dto.mortalityRate && dto.mortalityRate > 0.5) score += 15;
      if (dto.fcr && dto.fcr > 2.0) score += 10;

      const probability = maxScore > 0 ? Math.min((score / maxScore) * 100, 95) : 0;

      if (probability > 20) {
        predictions.push({
          diseaseId: disease.id,
          diseaseName: disease.name,
          probability: Math.round(probability * 10) / 10,
          possibleCauses: this.inferCauses(disease, dto),
          recommendedTests: this.recommendTests(disease),
          immediateActions: this.getImmediateActions(disease, dto),
          productionImpact: `FCR +${disease.fcrImpact || 5}%, ADG -${disease.adgImpact || 3}%`,
          disclaimer: 'REKOMENDACJA WSPORMAGAJĄCA — Nie zastępuje oceny lekarza weterynarii. Wymagana weryfikacja kliniczna.'
        });
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability).slice(0, 5);
  }

  private inferCauses(disease: any, dto: AIAdvisorRequestDto): string[] {
    const causes = [];
    if (dto.nh3 && dto.nh3 > 25) causes.push('Wysokie stężenie NH₃');
    if (dto.co2 && dto.co2 > 3000) causes.push('Niewydolna wentylacja (CO₂)');
    if (dto.humidity && dto.humidity > 75) causes.push('Wysoka wilgotność');
    if (dto.temperature && dto.temperature > 28) causes.push('Wysoka temperatura');
    if (causes.length === 0) causes.push('Czynnik patogenny');
    return causes;
  }

  private recommendTests(disease: any): string[] {
    const tests = ['Badanie kliniczne stada'];
    if (disease.name.includes('Bacteria') || disease.name.includes('E.coli')) {
      tests.push('Posiew bakteriologiczy', 'Antybiogram');
    }
    if (disease.name.includes('Virus') || disease.name.includes('Newcastle')) {
      tests.push('PCR', 'Serologia (ELISA)');
    }
    if (disease.name.includes('Coccidiosis')) {
      tests.push('Skatologiczne (OPG)', 'Histopatologia jelit');
    }
    return tests;
  }

  private getImmediateActions(disease: any, dto: AIAdvisorRequestDto): string[] {
    const actions = ['Izolacja podejrzanych ptaków', 'Wzmożony monitoring'];
    if (dto.nh3 && dto.nh3 > 25) actions.push('Zwiększenie wymiany powietrza');
    if (dto.temperature && dto.temperature > 28) actions.push('Obniżenie temperatury w kurniku');
    return actions;
  }
}
