import { Module } from '@nestjs/common';
import { SkillBadgesController } from './skill-badges.controller';
import { SkillBadgesService } from './skill-badges.service';

@Module({
  controllers: [SkillBadgesController],
  providers: [SkillBadgesService],
})
export class SkillBadgesModule {}
