import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  send(_payload: unknown) {
    return Promise.resolve();
  }
}
