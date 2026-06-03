import {
  IsInt,
  IsOptional,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCheckInDto {
  @IsOptional()
  @IsInt()
  booking_id?: number;

  @IsOptional()
  @IsInt()
  equipment_id?: number;

  @IsOptional()
  @IsInt()
  room_id?: number;

  @IsOptional()
  @IsDateString()
  check_in?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}
