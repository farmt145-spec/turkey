import { Controller, Get } from '@nestjs/common';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly service: FeedService) {}

  @Get()
  getStatus() {
    return this.service.getStatus();
  }
}
