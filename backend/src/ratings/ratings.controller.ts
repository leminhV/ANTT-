import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  create(@Req() req: Request, @Body() createRatingDto: CreateRatingDto) {
    const userId = (req.user as any).id;
    return this.ratingsService.create(userId, createRatingDto);
  }

  @Get()
  findAll(
    @Query('equipmentId') equipmentId?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.ratingsService.findAll(
      equipmentId ? parseInt(equipmentId) : undefined,
      roomId ? parseInt(roomId) : undefined,
    );
  }

  @Get('stats')
  getStats(
    @Query('equipmentId') equipmentId?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.ratingsService.getAverageScore(
      equipmentId ? parseInt(equipmentId) : undefined,
      roomId ? parseInt(roomId) : undefined,
    );
  }
}
