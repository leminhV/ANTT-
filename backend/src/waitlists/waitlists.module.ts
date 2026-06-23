import { Module } from '@nestjs/common';
import { WaitlistsController } from './waitlists.controller';
import { WaitlistsService } from './waitlists.service';

@Module({
  controllers: [WaitlistsController],
  providers: [WaitlistsService],
})
export class WaitlistsModule {}
