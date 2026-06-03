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
import { CheckInService } from './check-in.service';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { UpdateCheckInDto } from './dto/update-check-in.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('check-in')
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Post()
  create(
    @Body() createCheckInDto: CreateCheckInDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.checkInService.create(createCheckInDto, user.userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR)
  findAll() {
    return this.checkInService.findAll();
  }

  @Get('active/records')
  getActive() {
    return this.checkInService.getActiveRecords();
  }

  @Get('history/user')
  getHistory(@CurrentUser() user: UserPayload) {
    return this.checkInService.getUserHistory(user.userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserPayload,
  ) {
    return this.checkInService.findOneSecure(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCheckInDto: UpdateCheckInDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.checkInService.update(id, updateCheckInDto, user);
  }

  @Post(':id/check-out')
  checkOut(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserPayload,
  ) {
    return this.checkInService.checkOut(id, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.checkInService.remove(id);
  }
}
