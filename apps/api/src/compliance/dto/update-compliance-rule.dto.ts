import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { ComplianceRuleStatus } from '@prisma/client';
import { CreateComplianceRuleDto } from './create-compliance-rule.dto.js';

export class UpdateComplianceRuleDto extends PartialType(CreateComplianceRuleDto) {
  @IsOptional()
  @IsEnum(ComplianceRuleStatus)
  status?: ComplianceRuleStatus;
}
