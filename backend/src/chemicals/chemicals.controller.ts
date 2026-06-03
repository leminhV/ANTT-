import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ChemicalsService } from './chemicals.service';
import { CreateChemicalDto } from './dto/create-chemical.dto';
import { UpdateChemicalDto } from './dto/update-chemical.dto';
import { RecordUsageDto } from './dto/record-usage.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chemicals')
export class ChemicalsController {
  constructor(private readonly chemicalsService: ChemicalsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  create(@Body() createChemicalDto: CreateChemicalDto) {
    return this.chemicalsService.create(createChemicalDto);
  }

  @Post('usage/record')
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR)
  recordUsage(@Body() recordUsageDto: RecordUsageDto) {
    return this.chemicalsService.recordUsage(recordUsageDto);
  }

  @Get('history/usage')
  getUsageHistory(@Query('chemicalId') chemicalId?: string) {
    return this.chemicalsService.getUsageHistory(
      chemicalId ? parseInt(chemicalId, 10) : undefined,
    );
  }

  @Get()
  findAll() {
    return this.chemicalsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chemicalsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateChemicalDto: UpdateChemicalDto,
  ) {
    return this.chemicalsService.update(id, updateChemicalDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.chemicalsService.remove(id);
  }
}
