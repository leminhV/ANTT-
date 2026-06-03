import {
  IsString,
  IsInt,
  IsOptional,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class CreateReportDto {
  @IsOptional()
  @IsInt()
  equipment_id?: number;

  @IsOptional()
  @IsInt()
  room_id?: number;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;
}
