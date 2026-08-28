import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotFoundApiError } from '../../common/errors/api-error.js';
import { RecurringEngineService } from '../recurring/recurring-engine.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface.js';
import type { CreateTaskTemplateDto } from './dto/create-task-template.dto.js';
import type { UpdateTaskTemplateDto } from './dto/update-task-template.dto.js';

@Injectable()
export class TaskTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: RecurringEngineService,
  ) {}

  list(organizationId: string) {
    return this.prisma.taskTemplate.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOwned(organizationId: string, id: string) {
    const template = await this.prisma.taskTemplate.findFirst({ where: { id, organizationId } });
    if (!template) throw new NotFoundApiError('TEMPLATE_NOT_FOUND', 'This task template could not be found.');
    return template;
  }

  get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  create(user: AuthenticatedUser, dto: CreateTaskTemplateDto) {
    return this.prisma.taskTemplate.create({
      data: {
        organizationId: user.organizationId,
        createdByUserId: user.id,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        frequency: dto.frequency,
        scope: dto.scope,
        applicableServiceType: dto.applicableServiceType,
        defaultPriority: dto.defaultPriority,
        estimatedMinutes: dto.estimatedMinutes,
        checklistItems: dto.checklistItems ?? [],
        dueDayOfPeriod: dto.dueDayOfPeriod,
        leadDays: dto.leadDays,
        isActive: dto.isActive,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateTaskTemplateDto) {
    await this.findOwned(user.organizationId, id);
    return this.prisma.taskTemplate.update({
      where: { id },
      data: {
        ...dto,
        checklistItems: dto.checklistItems !== undefined ? dto.checklistItems : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.findOwned(user.organizationId, id);
    await this.prisma.taskTemplate.update({ where: { id }, data: { isActive: false } });
    return { message: 'Template deactivated.' };
  }

  /**
   * Manual "generate now" for the current org — runs the same idempotent
   * engine the daily cron job uses (via the BullMQ queue in production),
   * but synchronously so the UI can show the result immediately.
   */
  async runNow(user: AuthenticatedUser) {
    return this.engine.generateForOrganization(user.organizationId);
  }
}
