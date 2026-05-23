import { Module } from '@nestjs/common';
import { ChemicalsService } from './chemicals.service';
import { ChemicalsController } from './chemicals.controller';

@Module({
  controllers: [ChemicalsController],
  providers: [ChemicalsService],
})
export class ChemicalsModule {}
