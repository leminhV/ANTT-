import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class RecordUsageDto {
  @IsNumber()
  @IsPositive()
  chemicalId: number;

  @IsNumber()
  @IsPositive()
  amountUsed: number;

  @IsNumber()
  @IsOptional()
  bookingId?: number;
}
