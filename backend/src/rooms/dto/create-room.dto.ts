import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(255)
  location: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsBoolean()
  has_air_conditioner?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image_url?: string;
}
