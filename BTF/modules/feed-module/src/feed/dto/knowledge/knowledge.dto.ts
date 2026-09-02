import { IsString, IsOptional, IsUUID, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchKnowledgeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  materialId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phase?: string;
}

export class CreateKnowledgeEntryDto {
  @ApiProperty()
  @IsUUID()
  rawMaterialId: string;

  @ApiProperty({ enum: ['PUBLICATION', 'MANUFACTURER_GUIDE', 'STANDARD', 'COMMON_MISTAKE', 'RESEARCH_PAPER', 'CASE_STUDY', 'EXPERT_OPINION'] })
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  source: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiProperty()
  @IsString()
  summary: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  keyFindings: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  recommendations: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  tags: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  applicablePhases: string[];
}
