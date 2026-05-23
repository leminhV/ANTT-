import { IsString, IsInt, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class CreateBookingDto {
  @IsInt()
  room_id: number;

  @IsOptional()
  @IsInt()
  equipment_id?: number;

  @IsOptional()
  @IsInt()
  course_id?: number;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsString()
  purpose: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
