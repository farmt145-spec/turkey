import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditService {
  log(_entry: unknown) {
    return Promise.resolve();
  }
}
