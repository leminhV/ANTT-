import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.bookingsService.create(createBookingDto, user.userId);
  }

  @Get('export/excel')
  @Roles(Role.ADMIN, Role.INSTRUCTOR, Role.TECHNICIAN)
  async exportToExcel(@Res() res: Response) {
    const buffer = await this.bookingsService.exportToExcel();
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="bookings_export.xlsx"',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Get()
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingsService.findAll(
      startDate,
      endDate,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('user/my-bookings')
  findMyBookings(
    @CurrentUser() user: UserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bookingsService.findMyBookings(
      user.userId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Put('approve-all')
  @Roles(Role.ADMIN, Role.INSTRUCTOR, Role.TECHNICIAN)
  approveAllPending() {
    return this.bookingsService.approveAllPending();
  }

  @Get('suggest/slots')
  suggestSlots(
    @Query('room_id', ParseIntPipe) roomId: number,
    @Query('date') date: string,
    @Query('duration_minutes', ParseIntPipe) durationMinutes: number,
    @Query('equipment_id') equipmentId?: string,
  ) {
    return this.bookingsService.suggestSlots(
      roomId,
      date,
      durationMinutes,
      equipmentId ? parseInt(equipmentId, 10) : null,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserPayload,
  ) {
    return this.bookingsService.findOneSecure(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR, Role.TECHNICIAN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Post(':id/cancel')
  cancelBooking(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserPayload,
  ) {
    return this.bookingsService.cancelBooking(id, user.userId);
  }

  /**
   * Cho phép mọi user dời lịch (reschedule) đơn của chính mình
   * - Student: chỉ được dời đơn PENDING/APPROVED chưa bắt đầu
   * - Admin/Instructor: dời bất kỳ đơn nào
   */
  @Patch(':id/reschedule')
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { start_time: string; end_time: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.bookingsService.reschedule(
      id,
      body.start_time,
      body.end_time,
      user,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.remove(id);
  }
}
