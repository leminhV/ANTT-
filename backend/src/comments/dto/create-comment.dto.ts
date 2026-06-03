import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { JSDOM } from 'jsdom';
import * as dompurify from 'dompurify';

const window = new JSDOM('').window;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const DOMPurify = (dompurify as any).default || dompurify;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const purify = DOMPurify(window as any);

export class CreateCommentDto {
  @Transform(({ value }) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    typeof value === 'string' ? purify.sanitize(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsNumber()
  reportId?: number;

  @IsOptional()
  @IsNumber()
  bookingId?: number;

  @IsOptional()
  @IsNumber()
  equipmentId?: number;

  @IsOptional()
  @IsNumber()
  parentId?: number;
}
