import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { BulkUpdateSettingsDto } from './dto/bulk-update-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  findAll() {
    return this.settingsService.findAll();
  }

  @Put('bulk')
  @Roles(Role.ADMIN)
  bulkUpdate(@Body() bulkUpdateSettingsDto: BulkUpdateSettingsDto) {
    return this.settingsService.bulkUpdate(bulkUpdateSettingsDto.settings);
  }
}
