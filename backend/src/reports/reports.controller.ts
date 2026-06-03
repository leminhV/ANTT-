import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';
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
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(
    @Body() createReportDto: CreateReportDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportsService.create(createReportDto, user.userId);
  }

  @Get()
  findAll() {
    return this.reportsService.findAll();
  }

  @Get('user/my-reports')
  findMyReports(@CurrentUser() user: UserPayload) {
    return this.reportsService.findMyReports(user.userId);
  }

  @Get('statistics/overview')
  getStatistics() {
    return this.reportsService.getStatistics();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportsService.findOneSecure(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.reportsService.update(id, updateReportDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.remove(id);
  }
}
