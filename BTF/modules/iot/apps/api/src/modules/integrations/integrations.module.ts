import { Module } from '@nestjs/common';
import { ModbusService } from './modbus/modbus.service';
import { MqttService } from './mqtt/mqtt.service';
import { FancomService } from './fancom/fancom.service';
import { BigDutchmanService } from './big-dutchman/big-dutchman.service';
import { SkovService } from './skov/skov.service';
import { OpcUaService } from './opc-ua/opc-ua.service';
import { RestApiService } from './rest-api/rest-api.service';
import { WebsocketIntegrationService } from './websocket/websocket-integration.service';
@Module({
  providers: [ModbusService, MqttService, FancomService, BigDutchmanService, SkovService, OpcUaService, RestApiService, WebsocketIntegrationService],
  exports: [ModbusService, MqttService],
})
export class IntegrationsModule {}
