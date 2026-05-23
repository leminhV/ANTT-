import { IsString, IsNumber, IsOptional, MaxLength, IsDateString, Min } from 'class-validator';

export class CreateChemicalDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  formula?: string;

  @IsNumber()
  @Min(0)
  quantity_stock: number;

  @IsString()
  @MaxLength(20)
  unit: string;

  @IsOptional()
  @IsDateString()
  expiration_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;
}
