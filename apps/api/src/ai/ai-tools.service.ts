import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { GstService } from '../gst/gst.service.js';
import { TdsService } from '../tds/tds.service.js';
import { ItrService } from '../itr/itr.service.js';
import { RocService } from '../roc/roc.service.js';
import { BillingService } from '../billing/billing.service.js';
import { AttendanceService } from '../attendance/attendance.service.js';
import { LeaveService } from '../leave/leave.service.js';
import { UdinService } from '../udin/udin.service.js';
import { NoticesService } from '../notices/notices.service.js';
import { DocumentRequestsService } from '../document-requests/document-requests.service.js';
import { KnowledgeService } from '../knowledge/knowledge.service.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { ListGstReturnsDto } from '../gst/dto/gst-return.dto.js';
import type { ListTdsReturnsDto } from '../tds/dto/tds-return.dto.js';
import type { ListItrReturnsDto } from '../itr/dto/itr-return.dto.js';
import type { ListRocFilingsDto } from '../roc/dto/roc-filing.dto.js';
import type { ListInvoicesDto } from '../billing/dto/invoice.dto.js';
import type { ListUdinDto } from '../udin/dto/list-udin.dto.js';
import type { ListNoticesDto } from '../notices/dto/list-notices.dto.js';
import type { ListDocumentRequestsDto } from '../document-requests/dto/list-document-requests.dto.js';
import type { ListLeaveRequestsDto } from '../leave/dto/leave-request.dto.js';

/**
 * Controlled backend tools the AI Copilot may call. Every method takes
 * organizationId (and userId where relevant) as an explicit parameter
 * supplied by the backend from the authenticated session — never from the
 * model's tool-call arguments — so the AI can never read another tenant's
 * data (spec section 31/32). Nothing here executes arbitrary SQL, and none
 * of these tools return client secrets (PAN/GSTIN/address) — just the
 * aggregate counts and status a CA would ask for. Status/summary tools reuse
 * the same feature services (GstService, ItrService, etc.) their REST
 * endpoints use, rather than duplicating query logic, so the AI can never
 * see a different answer than the app's own pages show.
 */
@Injectable()
export class AiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly gst: GstService,
    private readonly tds: TdsService,
    private readonly itr: ItrService,
    private readonly roc: RocService,
    private readonly billing: BillingService,
    private readonly attendance: AttendanceService,
    private readonly leave: LeaveService,
    private readonly udin: UdinService,
    private readonly notices: NoticesService,
    private readonly documentRequests: DocumentRequestsService,
    private readonly knowledge: KnowledgeService,
  ) {}

  private async resolveClient(organizationId: string, clientName: string) {
    return this.prisma.client.findFirst({
      where: { organizationId, deletedAt: null, displayName: { contains: clientName, mode: 'insensitive' } },
      select: { id: true, displayName: true },
    });
  }

  async getTodayTasks(organizationId: string, userId: string) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId,
        assignedUserId: userId,
        deletedAt: null,
        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
        OR: [{ dueDate: { lte: end } }, { dueDate: null }],
      },
      select: { title: true, priority: true, status: true, dueDate: true, client: { select: { displayName: true } } },
      take: 20,
    });
    if (tasks.length === 0) return { message: 'No tasks due today.' };
    return {
      tasks: tasks.map((t) => ({
        title: t.title,
        client: t.client?.displayName ?? 'Internal',
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
      })),
    };
  }

  async getOverdueTasks(organizationId: string, userId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId,
        assignedUserId: userId,
        deletedAt: null,
        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
        dueDate: { lt: start },
      },
      select: { title: true, priority: true, dueDate: true, client: { select: { displayName: true } } },
      take: 20,
    });
    if (tasks.length === 0) return { message: 'No overdue tasks.' };
    return {
      tasks: tasks.map((t) => ({
        title: t.title,
        client: t.client?.displayName ?? 'Internal',
        priority: t.priority,
        dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
      })),
    };
  }

  async getClientSummary(organizationId: string, clientName: string) {
    const client = await this.prisma.client.findFirst({
      where: { organizationId, deletedAt: null, displayName: { contains: clientName, mode: 'insensitive' } },
      select: { id: true, displayName: true, status: true },
    });
    if (!client) return { message: `Information not available. No client matching "${clientName}" was found.` };

    const [taskTotal, taskCompleted, taskOverdue, taskPending, complianceTotal, complianceCompleted, complianceOverdue, followUps] =
      await Promise.all([
        this.prisma.task.count({ where: { organizationId, clientId: client.id, deletedAt: null } }),
        this.prisma.task.count({ where: { organizationId, clientId: client.id, status: 'COMPLETED' } }),
        this.prisma.task.count({
          where: { organizationId, clientId: client.id, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: new Date() } },
        }),
        this.prisma.task.count({
          where: { organizationId, clientId: client.id, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } },
        }),
        this.prisma.complianceEvent.count({ where: { organizationId, clientId: client.id } }),
        this.prisma.complianceEvent.count({ where: { organizationId, clientId: client.id, status: 'COMPLETED' } }),
        this.prisma.complianceEvent.count({ where: { organizationId, clientId: client.id, status: 'OVERDUE' } }),
        this.prisma.task.count({ where: { organizationId, clientId: client.id, category: 'FOLLOW_UP', deletedAt: null, status: { not: 'COMPLETED' } } }),
      ]);

    return {
      client: client.displayName,
      status: client.status,
      compliancePercent: complianceTotal === 0 ? null : Math.round((complianceCompleted / complianceTotal) * 100),
      complianceOverdue,
      tasksPending: taskPending,
      tasksOverdue: taskOverdue,
      tasksCompleted: taskCompleted,
      tasksTotal: taskTotal,
      followUpsPending: followUps,
      documentsPending: 'Information not available (documents module not yet built).',
      paymentsOutstanding: 'Information not available (payments module not yet built).',
    };
  }

  async getComplianceEvents(organizationId: string, status?: string, clientName?: string) {
    const events = await this.prisma.complianceEvent.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : { status: { in: ['UPCOMING', 'DUE', 'OVERDUE'] } }),
        ...(clientName ? { client: { displayName: { contains: clientName, mode: 'insensitive' } } } : {}),
      },
      select: { dueDate: true, status: true, client: { select: { displayName: true } }, complianceRule: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });
    if (events.length === 0) return { message: 'No matching compliance items.' };
    return {
      events: events.map((e) => ({
        name: e.complianceRule.name,
        client: e.client.displayName,
        dueDate: e.dueDate.toISOString().slice(0, 10),
        status: e.status,
      })),
    };
  }

  /**
   * Write tool: creates a real Task. This method itself performs no
   * confirmation check — the guarantee lives one layer up, in
   * AiService.confirmAction, which is the only caller. A model tool-call
   * never reaches this method directly; it only ever stages an
   * AiPendingAction row, and this runs solely when the user explicitly
   * confirms that specific pending action via the API.
   */
  async createTask(
    user: AuthenticatedUser,
    args: { title: string; clientName?: string; dueDate?: string; priority?: string; category?: string },
  ) {
    let clientId: string | undefined;
    if (args.clientName) {
      const client = await this.prisma.client.findFirst({
        where: { organizationId: user.organizationId, deletedAt: null, displayName: { contains: args.clientName, mode: 'insensitive' } },
        select: { id: true, displayName: true },
      });
      if (!client) return { error: `No client matching "${args.clientName}" was found. Task was not created.` };
      clientId = client.id;
    }

    const priority = (['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).includes(args.priority as never)
      ? (args.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')
      : 'MEDIUM';
    const category = args.category === 'FOLLOW_UP' ? 'FOLLOW_UP' : 'CLIENT_SPECIFIC';

    const task = await this.prisma.task.create({
      data: {
        organizationId: user.organizationId,
        clientId,
        title: args.title,
        category,
        priority,
        assignedUserId: user.id,
        dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
        createdByUserId: user.id,
      },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ai_task_created',
      entityType: 'task',
      entityId: task.id,
      after: task,
      metadata: { title: task.title, source: 'ai_tool' },
    });
    return { created: true, taskId: task.id, title: task.title, dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null };
  }

  /** Write tool: creates a follow-up (modeled as a Task with category=FOLLOW_UP — see docs/STATUS.md). */
  async createFollowup(user: AuthenticatedUser, args: { clientName: string; reason: string; date?: string }) {
    const client = await this.prisma.client.findFirst({
      where: { organizationId: user.organizationId, deletedAt: null, displayName: { contains: args.clientName, mode: 'insensitive' } },
      select: { id: true, displayName: true },
    });
    if (!client) return { error: `No client matching "${args.clientName}" was found. Follow-up was not created.` };

    const task = await this.prisma.task.create({
      data: {
        organizationId: user.organizationId,
        clientId: client.id,
        title: args.reason,
        category: 'FOLLOW_UP',
        priority: 'MEDIUM',
        assignedUserId: user.id,
        dueDate: args.date ? new Date(args.date) : undefined,
        createdByUserId: user.id,
      },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ai_followup_created',
      entityType: 'task',
      entityId: task.id,
      after: task,
      metadata: { client: client.displayName, source: 'ai_tool' },
    });
    return { created: true, taskId: task.id, client: client.displayName, dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null };
  }

  async getGstStatus(organizationId: string, clientName?: string) {
    if (!clientName) return this.gst.summary(organizationId);
    const client = await this.resolveClient(organizationId, clientName);
    if (!client) return { message: `No client matching "${clientName}" was found.` };
    const { items } = await this.gst.listReturns(organizationId, { clientId: client.id, page: 1, pageSize: 10 } as ListGstReturnsDto);
    if (items.length === 0) return { message: `No GST returns found for ${client.displayName}.` };
    return {
      client: client.displayName,
      returns: items.map((r) => ({ type: r.returnType, period: r.taxPeriod, dueDate: r.dueDate.toISOString().slice(0, 10), status: r.status })),
    };
  }

  async getTdsStatus(organizationId: string, clientName?: string) {
    if (!clientName) return this.tds.summary(organizationId);
    const client = await this.resolveClient(organizationId, clientName);
    if (!client) return { message: `No client matching "${clientName}" was found.` };
    const { items } = await this.tds.listReturns(organizationId, { clientId: client.id, page: 1, pageSize: 10 } as ListTdsReturnsDto);
    if (items.length === 0) return { message: `No TDS returns found for ${client.displayName}.` };
    return {
      client: client.displayName,
      returns: items.map((r) => ({ type: r.returnType, quarter: r.quarter, dueDate: r.dueDate.toISOString().slice(0, 10), status: r.status })),
    };
  }

  async getItrStatus(organizationId: string, clientName?: string) {
    if (!clientName) return this.itr.summary(organizationId);
    const client = await this.resolveClient(organizationId, clientName);
    if (!client) return { message: `No client matching "${clientName}" was found.` };
    const { items } = await this.itr.list(organizationId, { clientId: client.id, page: 1, pageSize: 10 } as ListItrReturnsDto);
    if (items.length === 0) return { message: `No ITR returns found for ${client.displayName}.` };
    return {
      client: client.displayName,
      returns: items.map((r) => ({ formType: r.formType, assessmentYear: r.assessmentYear, dueDate: r.dueDate.toISOString().slice(0, 10), status: r.status })),
    };
  }

  async getRocStatus(organizationId: string, clientName?: string) {
    if (!clientName) return this.roc.summary(organizationId);
    const client = await this.resolveClient(organizationId, clientName);
    if (!client) return { message: `No client matching "${clientName}" was found.` };
    const { items } = await this.roc.list(organizationId, { clientId: client.id, page: 1, pageSize: 10 } as ListRocFilingsDto);
    if (items.length === 0) return { message: `No ROC/MCA filings found for ${client.displayName}.` };
    return {
      client: client.displayName,
      filings: items.map((f) => ({ formType: f.formType, financialYear: f.financialYear, dueDate: f.dueDate.toISOString().slice(0, 10), status: f.status })),
    };
  }

  async getBillingSummary(organizationId: string, clientName?: string) {
    if (!clientName) return this.billing.summary(organizationId);
    const client = await this.resolveClient(organizationId, clientName);
    if (!client) return { message: `No client matching "${clientName}" was found.` };
    const { items } = await this.billing.listInvoices(organizationId, { clientId: client.id, page: 1, pageSize: 10 } as ListInvoicesDto);
    if (items.length === 0) return { message: `No invoices found for ${client.displayName}.` };
    return {
      client: client.displayName,
      invoices: items.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        dueDate: i.dueDate.toISOString().slice(0, 10),
        totalAmount: i.totalAmount.toString(),
        amountPaid: i.amountPaid.toString(),
        status: i.status,
      })),
    };
  }

  async getMyLeaveRequests(user: AuthenticatedUser) {
    const [summary, list] = await Promise.all([
      this.leave.summary(user),
      this.leave.list(user, { page: 1, pageSize: 10 } as ListLeaveRequestsDto),
    ]);
    return {
      ...summary.myRequests,
      recentRequests: list.items.map((r) => ({
        leaveType: r.leaveType,
        startDate: r.startDate.toISOString().slice(0, 10),
        endDate: r.endDate.toISOString().slice(0, 10),
        days: r.days.toString(),
        status: r.status,
      })),
    };
  }

  async getMyAttendanceStatus(organizationId: string, user: AuthenticatedUser) {
    return this.attendance.summary(organizationId, user);
  }

  async getDocumentRequestsStatus(organizationId: string, clientName?: string) {
    let client: { id: string; displayName: string } | null = null;
    if (clientName) {
      client = await this.resolveClient(organizationId, clientName);
      if (!client) return { message: `No client matching "${clientName}" was found.` };
    }
    const { items } = await this.documentRequests.list(organizationId, {
      ...(client ? { clientId: client.id } : {}),
      page: 1,
      pageSize: 10,
    } as ListDocumentRequestsDto);
    if (items.length === 0) return { message: client ? `No document requests found for ${client.displayName}.` : 'No document requests found.' };
    return {
      requests: items.map((r) => ({
        client: r.client.displayName,
        title: r.title,
        status: r.status,
        dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
        itemCount: r.items.length,
      })),
    };
  }

  async getUdinRecords(organizationId: string, clientName?: string) {
    let client: { id: string; displayName: string } | null = null;
    if (clientName) {
      client = await this.resolveClient(organizationId, clientName);
      if (!client) return { message: `No client matching "${clientName}" was found.` };
    }
    const { items } = await this.udin.list(organizationId, { ...(client ? { clientId: client.id } : {}), page: 1, pageSize: 10 } as ListUdinDto);
    if (items.length === 0) return { message: client ? `No UDIN records found for ${client.displayName}.` : 'No UDIN records found.' };
    return {
      records: items.map((r) => ({ client: r.client.displayName, udinNumber: r.udinNumber, documentType: r.documentType, status: r.status })),
    };
  }

  async getNotices(organizationId: string, clientName?: string) {
    let client: { id: string; displayName: string } | null = null;
    if (clientName) {
      client = await this.resolveClient(organizationId, clientName);
      if (!client) return { message: `No client matching "${clientName}" was found.` };
    }
    const { items } = await this.notices.list(organizationId, { ...(client ? { clientId: client.id } : {}), page: 1, pageSize: 10 } as ListNoticesDto);
    if (items.length === 0) return { message: client ? `No notices found for ${client.displayName}.` : 'No notices found.' };
    return {
      notices: items.map((n) => ({
        client: n.client.displayName,
        type: n.noticeType,
        referenceNumber: n.referenceNumber,
        responseDeadline: n.responseDeadline ? n.responseDeadline.toISOString().slice(0, 10) : null,
        status: n.status,
      })),
    };
  }

  /** Write tool: creates a leave request for the requesting user only — never for someone else. */
  async createLeaveRequest(
    user: AuthenticatedUser,
    args: { leaveType: string; startDate: string; endDate: string; days: number; reason?: string },
  ) {
    const leaveType = (['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'OTHER'] as const).includes(args.leaveType as never)
      ? (args.leaveType as 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID' | 'OTHER')
      : 'CASUAL';
    const request = await this.leave.create(user, {
      leaveType,
      startDate: args.startDate,
      endDate: args.endDate,
      days: args.days,
      reason: args.reason,
    });
    return { created: true, leaveRequestId: request.id, leaveType: request.leaveType, days: request.days.toString(), status: request.status };
  }

  /** Real semantic search over the firm's own knowledge base — closes the RAG loop for the AI Copilot. */
  async searchKnowledgeBase(organizationId: string, query: string) {
    const { results } = await this.knowledge.search(organizationId, query, 5);
    if (results.length === 0) return { message: 'No matching entries found in the knowledge base.' };
    return { results: results.map((r) => ({ document: r.documentTitle, excerpt: r.content, relevance: r.score })) };
  }

  /** Write tool: creates a document request checklist for a client. */
  async createDocumentRequest(user: AuthenticatedUser, args: { clientName: string; title: string; items?: string[] }) {
    const client = await this.resolveClient(user.organizationId, args.clientName);
    if (!client) return { error: `No client matching "${args.clientName}" was found. Document request was not created.` };

    const request = await this.documentRequests.create(user, {
      clientId: client.id,
      title: args.title,
      items: (args.items ?? []).map((label) => ({ label, isRequired: true })),
    });
    return { created: true, documentRequestId: request.id, client: client.displayName, title: request.title };
  }
}
