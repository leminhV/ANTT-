import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateChemicalLimitDto {
  @IsNumber()
  @IsPositive()
  course_id: number;

  @IsNumber()
  @IsPositive()
  chemical_id: number;

  @IsNumber()
  @IsPositive()
  @Min(0.001)
  max_quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateChemicalLimitDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0.001)
  max_quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class GetChemicalLimitsDto {
  @IsOptional()
  @IsNumber()
  course_id?: number;

  @IsOptional()
  @IsNumber()
  chemical_id?: number;
}
