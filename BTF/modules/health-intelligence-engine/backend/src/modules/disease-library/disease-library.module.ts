import { Module } from '@nestjs/common';
import { DiseaseLibraryController } from './disease-library.controller';
import { DiseaseLibraryService } from './disease-library.service';

@Module({
  controllers: [DiseaseLibraryController],
  providers: [DiseaseLibraryService],
  exports: [DiseaseLibraryService],
})
export class DiseaseLibraryModule {}
