import { Module } from '@nestjs/common';
import { DigitalTwinService } from './digital-twin.service';
@Module({ providers: [DigitalTwinService], exports: [DigitalTwinService] })
export class DigitalTwinModule {}
