import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  create(
    @Body()
    data: {
      room_id?: number;
      equipment_id?: number;
      start_time: string;
      end_time: string;
      description: string;
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.maintenanceService.create({
      ...data,
      created_by: user.userId,
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR)
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      room_id?: number;
      equipment_id?: number;
      start_time?: string;
      end_time?: string;
      description?: string;
    },
  ) {
    return this.maintenanceService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.remove(id);
  }
}
