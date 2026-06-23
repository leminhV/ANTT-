import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ChemicalLimitsService } from './chemical-limits.service';
import {
  CreateChemicalLimitDto,
  UpdateChemicalLimitDto,
  GetChemicalLimitsDto,
} from './dto/create-chemical-limit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chemical-limits')
export class ChemicalLimitsController {
  constructor(private readonly chemicalLimitsService: ChemicalLimitsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR)
  create(
    @Body() createDto: CreateChemicalLimitDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.chemicalLimitsService.create(createDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR, Role.STUDENT)
  findAll(@Query() filters: GetChemicalLimitsDto) {
    return this.chemicalLimitsService.findAll(filters);
  }

  @Get('course/:courseId/stats')
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR)
  getCourseStats(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.chemicalLimitsService.getUsageStats(courseId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chemicalLimitsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateChemicalLimitDto,
  ) {
    return this.chemicalLimitsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.chemicalLimitsService.remove(id);
  }

  @Get('check/:courseId/:chemicalId')
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR, Role.STUDENT)
  checkLimit(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('chemicalId', ParseIntPipe) chemicalId: number,
    @Query('quantity') quantity: number,
  ) {
    return this.chemicalLimitsService.checkLimit(
      courseId,
      chemicalId,
      quantity,
    );
  }
}
