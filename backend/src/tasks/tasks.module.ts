import { Module } from '@nestjs/common';
import { CronjobsService } from './cronjobs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [CronjobsService],
})
export class TasksModule {}
