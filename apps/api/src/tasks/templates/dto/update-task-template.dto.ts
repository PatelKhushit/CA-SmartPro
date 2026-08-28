import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskTemplateDto } from './create-task-template.dto.js';

export class UpdateTaskTemplateDto extends PartialType(CreateTaskTemplateDto) {}
