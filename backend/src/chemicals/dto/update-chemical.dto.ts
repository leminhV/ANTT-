import { PartialType } from '@nestjs/mapped-types';
import { CreateChemicalDto } from './create-chemical.dto';

export class UpdateChemicalDto extends PartialType(CreateChemicalDto) {}
