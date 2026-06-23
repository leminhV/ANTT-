import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { WaitlistsService } from './waitlists.service';
import { CreateWaitlistDto } from './dto/waitlist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('waitlists')
export class WaitlistsController {
  constructor(private readonly waitlistsService: WaitlistsService) {}

  @Post()
  create(@Req() req: Request, @Body() createWaitlistDto: CreateWaitlistDto) {
    const userId = (req.user as any).id;
    return this.waitlistsService.create(userId, createWaitlistDto);
  }

  @Get()
  findAllByUser(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.waitlistsService.findAllByUser(userId);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const userId = (req.user as any).id;
    return this.waitlistsService.remove(id, userId);
  }
}
