import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface KnowledgeSearchResult {
  entries: Array<{
    id: string;
    type: string;
    title: string;
    source: string;
    year?: number;
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    credibility: number;
    isPeerReviewed: boolean;
    tags: string[];
  }>;
  commonMistakes: Array<{
    mistake: string;
    consequence: string;
    solution: string;
  }>;
  expertTips: string[];
}

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async searchKnowledge(
    query?: string,
    materialId?: string,
    type?: string,
    phase?: string,
  ): Promise<KnowledgeSearchResult> {
    const where: any = {};

    if (materialId) where.rawMaterialId = materialId;
    if (type) where.type = type;
    if (phase) where.applicablePhases = { has: phase };
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { summary: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ];
    }

    const entries = await this.prisma.materialKnowledgeEntry.findMany({
      where,
      orderBy: [{ credibility: 'desc' }, { year: 'desc' }],
      take: 50,
    });

    // Pobierz typowe błędy
    const mistakes = await this.prisma.materialKnowledgeEntry.findMany({
      where: { type: 'COMMON_MISTAKE', ...(materialId && { rawMaterialId: materialId }) },
      take: 10,
    });

    // Generuj eksperckie wskazówki
    const expertTips = this.generateExpertTips(materialId);

    return {
      entries: entries.map(e => ({
        id: e.id,
        type: e.type,
        title: e.title,
        source: e.source,
        year: e.year || undefined,
        summary: e.summary,
        keyFindings: e.keyFindings as string[],
        recommendations: e.recommendations as string[],
        credibility: e.credibility,
        isPeerReviewed: e.isPeerReviewed,
        tags: e.tags as string[],
      })),
      commonMistakes: mistakes.map(m => {
        const findings = m.keyFindings as string[];
        return {
          mistake: m.title,
          consequence: findings[0] || 'Nieznane',
          solution: m.recommendations[0] || 'Skonsultuj z ekspertem',
        };
      }),
      expertTips,
    };
  }

  async getMaterialKnowledge(materialId: string): Promise<KnowledgeSearchResult> {
    return this.searchKnowledge(undefined, materialId);
  }

  async addKnowledgeEntry(data: {
    rawMaterialId: string;
    type: string;
    title: string;
    source: string;
    year?: number;
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    tags: string[];
    applicablePhases: string[];
  }): Promise<any> {
    return this.prisma.materialKnowledgeEntry.create({
      data: {
        ...data,
        credibility: 7,
        isPeerReviewed: false,
      } as any,
    });
  }

  private generateExpertTips(materialId?: string): string[] {
    const tips: string[] = [];

    if (!materialId) {
      tips.push('Zawsze sprawdzaj wilgotność kukurydzy przed użyciem — >14% sprzyja pleśniom.');
      tips.push('Nie przekraczaj 0.20% sodu w paszy dla indyków brojlerów — wpływa na ściółkę i wodę.');
      tips.push('Monitoruj poziom aflatoksyny B1 — nawet 20 ppb może obniżyć odporność.');
      tips.push('Stosunek Ca:P strawnego powinien wynosić 2:1 do 2.5:1 w fazie starter.');
      tips.push('Lizyna jest pierwszym aminokwasem limitującym — zawsze sprawdzaj jej poziom.');
    }

    return tips;
  }
}
