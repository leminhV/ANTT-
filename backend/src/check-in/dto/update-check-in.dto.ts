import { PartialType } from '@nestjs/mapped-types';
import { CreateCheckInDto } from './create-check-in.dto';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateCheckInDto extends PartialType(CreateCheckInDto) {
  @IsOptional()
  @IsDateString()
  check_out?: string;
}
