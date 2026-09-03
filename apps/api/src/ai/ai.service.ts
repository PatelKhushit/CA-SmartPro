import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, type Content, type FunctionDeclaration, type Part } from '@google/genai';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ConflictApiError, ForbiddenApiError, NotFoundApiError } from '../common/errors/api-error.js';
import { AiToolsService } from './ai-tools.service.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

const PENDING_ACTION_TTL_MINUTES = 15;

function summarizeAction(name: string, input: Record<string, unknown>): string {
  if (name === 'create_task') {
    const title = String(input.title ?? 'Untitled task');
    const client = input.clientName ? ` for ${String(input.clientName)}` : '';
    const due = input.dueDate ? ` due ${String(input.dueDate)}` : '';
    const priority = input.priority ? ` (${String(input.priority)} priority)` : '';
    return `Create task "${title}"${client}${due}${priority}`;
  }
  if (name === 'create_followup') {
    const client = input.clientName ? String(input.clientName) : 'the client';
    const reason = input.reason ? String(input.reason) : '';
    const date = input.date ? ` on ${String(input.date)}` : '';
    return `Create a follow-up for ${client}${date}: "${reason}"`;
  }
  if (name === 'create_leave_request') {
    const type = input.leaveType ? String(input.leaveType).toLowerCase() : 'casual';
    const days = input.days ?? '?';
    const range = input.startDate === input.endDate ? String(input.startDate ?? '') : `${String(input.startDate ?? '')} to ${String(input.endDate ?? '')}`;
    return `Request ${days} day(s) of ${type} leave (${range})`;
  }
  if (name === 'create_document_request') {
    const client = input.clientName ? String(input.clientName) : 'the client';
    const title = input.title ? String(input.title) : 'Document request';
    return `Create a document request "${title}" for ${client}`;
  }
  return `${name}(${JSON.stringify(input)})`;
}

const READ_TOOL_PERMISSIONS: Record<string, string> = {
  get_gst_status: 'gst.view',
  get_tds_status: 'tds.view',
  get_itr_status: 'itr.view',
  get_roc_status: 'roc.view',
  get_billing_summary: 'payments.view',
  get_my_leave_requests: 'leave.view',
  get_my_attendance_status: 'attendance.view',
  get_document_requests_status: 'document_requests.view',
  get_udin_records: 'udin.view',
  get_notices: 'notices.view',
  search_knowledge_base: 'knowledge.view',
};

const SYSTEM_PROMPT = `You are CA Copilot, an AI assistant embedded inside CA SmartPro, a Chartered Accountant practice management system.

You may ONLY help with:
- CA practice management
- Tax concepts (conceptual/informational)
- GST concepts
- TDS concepts
- Accounting concepts
- Compliance workflows
- Client task summaries (using the provided tools)
- Document workflows
- Productivity within this app
- CA business management

If the user asks about anything outside this domain, reply with exactly this sentence and nothing else:
"I am designed specifically for CA, taxation, accounting, compliance and CA practice-management related assistance."

Rules:
- Never guess or fabricate client data. Use the provided tools to retrieve real information. If a tool reports something is unavailable, tell the user "Information not available" rather than inventing a number.
- Clearly distinguish between: (a) general informational explanation, (b) a calculated estimate, (c) official/source-backed information, and (d) a recommendation that requires professional review.
- Never state that something is "definitely legally correct." Statutory rules can change; the CA remains responsible for professional review before filing or advising a client.
- You have exactly four write tools: create_task, create_followup, create_leave_request (always for the current user only — never for anyone else), and create_document_request. Calling any of them does NOT create anything by itself — it stages a pending action that the app will show the user as a card with Confirm/Cancel buttons; nothing is written to the database until the user clicks Confirm. So when a request is clear, call the tool right away (staging is safe and reversible) and then briefly tell the user what you've prepared and that it's waiting for their confirmation below — do not ask "should I create this?" in your own text, the confirmation card handles that. If the request is genuinely ambiguous (e.g. no client name, no clear title, no leave dates), ask a clarifying question instead of guessing.
- You also have read tools for GST, TDS, ITR, ROC/MCA, billing/invoices, attendance, leave, document requests, UDIN, and notices status — use them whenever a question needs real data instead of answering from general knowledge. Each of these respects the asking user's own permissions: if a tool reports a permission error, tell the user they don't have access to that module rather than guessing an answer.
- You have a search_knowledge_base tool that searches the firm's own saved internal documentation. Use it before falling back to general knowledge whenever a question might be covered by something the firm itself has written down (an SOP, an internal policy, firm-specific guidance). If it returns nothing relevant, say so and answer from general knowledge instead — never claim the knowledge base said something it didn't.
- You cannot send emails, WhatsApp messages, record payments, approve/reject anything, or perform any other write/destructive action — only the four tools named above can write anything, and all four require explicit user confirmation first.
- Keep answers concise and practical for a working CA.`;

const TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_today_tasks',
    description: "Get the current user's tasks due today or earlier, ranked by priority.",
    parametersJsonSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_overdue_tasks',
    description: "Get the current user's overdue tasks.",
    parametersJsonSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_client_summary',
    description: 'Get a compliance/task/follow-up summary for a specific client by name.',
    parametersJsonSchema: {
      type: 'object',
      properties: { clientName: { type: 'string', description: 'The client display name to look up.' } },
      required: ['clientName'],
    },
  },
  {
    name: 'get_compliance_events',
    description: 'List compliance items, optionally filtered by status (UPCOMING, DUE, OVERDUE, COMPLETED, WAIVED) and/or client name.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'UPCOMING | DUE | OVERDUE | COMPLETED | WAIVED' },
        clientName: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task, optionally for a specific client. Only call this after the user has confirmed the action.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        clientName: { type: 'string', description: 'Optional — omit for an internal/firm task.' },
        dueDate: { type: 'string', description: 'ISO date, e.g. 2026-08-30.' },
        priority: { type: 'string', description: 'LOW | MEDIUM | HIGH | URGENT' },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_followup',
    description: 'Create a client follow-up (a task category used for follow-up reminders). Only call this after the user has confirmed the action.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        clientName: { type: 'string' },
        reason: { type: 'string', description: 'What the follow-up is about.' },
        date: { type: 'string', description: 'ISO date, e.g. 2026-08-30.' },
      },
      required: ['clientName', 'reason'],
    },
  },
  {
    name: 'get_gst_status',
    description: 'Get GST return status — a firm-wide summary if no client is given, or the recent returns for one client by name.',
    parametersJsonSchema: { type: 'object', properties: { clientName: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_tds_status',
    description: 'Get TDS return status — a firm-wide summary if no client is given, or the recent returns for one client by name.',
    parametersJsonSchema: { type: 'object', properties: { clientName: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_itr_status',
    description: 'Get income tax (ITR) return status — a firm-wide summary if no client is given, or the recent returns for one client by name.',
    parametersJsonSchema: { type: 'object', properties: { clientName: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_roc_status',
    description: 'Get ROC/MCA filing status — a firm-wide summary if no client is given, or the recent filings for one client by name.',
    parametersJsonSchema: { type: 'object', properties: { clientName: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_billing_summary',
    description: 'Get billing status — firm-wide outstanding/overdue invoice totals if no client is given, or the recent invoices for one client by name.',
    parametersJsonSchema: { type: 'object', properties: { clientName: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_my_leave_requests',
    description: "Get the current user's own leave request history and this-year totals. Never returns another user's leave data.",
    parametersJsonSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_my_attendance_status',
    description: "Get the current user's today/this-month attendance status.",
    parametersJsonSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_document_requests_status',
    description: 'Get document request checklist status (pending/partial/fulfilled), optionally for one client by name.',
    parametersJsonSchema: { type: 'object', properties: { clientName: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_udin_records',
    description: 'List UDIN records, optionally for one client by name.',
    parametersJsonSchema: { type: 'object', properties: { clientName: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_notices',
    description: 'List government/department notices, optionally for one client by name.',
    parametersJsonSchema: { type: 'object', properties: { clientName: { type: 'string' } }, required: [] },
  },
  {
    name: 'search_knowledge_base',
    description:
      "Semantically search the firm's own internal knowledge base (SOPs, internal notes, firm-specific guidance the firm has written and saved) for content relevant to the user's question. Use this before answering questions that might be covered by firm-specific documentation rather than general tax knowledge.",
    parametersJsonSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to search for.' } },
      required: ['query'],
    },
  },
  {
    name: 'create_leave_request',
    description: 'Request leave for the current user (never for anyone else). Only call this after the user has confirmed the action.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        leaveType: { type: 'string', description: 'CASUAL | SICK | EARNED | UNPAID | OTHER' },
        startDate: { type: 'string', description: 'ISO date, e.g. 2026-09-10.' },
        endDate: { type: 'string', description: 'ISO date, e.g. 2026-09-10.' },
        days: { type: 'number', description: 'Number of leave days, e.g. 1, or 0.5 for a half day.' },
        reason: { type: 'string' },
      },
      required: ['leaveType', 'startDate', 'endDate', 'days'],
    },
  },
  {
    name: 'create_document_request',
    description: 'Create a document request checklist for a client. Only call this after the user has confirmed the action.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        clientName: { type: 'string' },
        title: { type: 'string' },
        items: {
          type: 'array',
          items: { type: 'string' },
          description: 'Document labels to request, e.g. ["Bank statements", "Form 16"].',
        },
      },
      required: ['clientName', 'title'],
    },
  },
];

const WRITE_TOOLS = new Set(['create_task', 'create_followup', 'create_leave_request', 'create_document_request']);

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tools: AiToolsService,
    private readonly audit: AuditService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('ai.apiKey'));
  }

  async listConversations(user: AuthenticatedUser) {
    return this.prisma.aiConversation.findMany({
      where: { organizationId: user.organizationId, userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getConversation(user: AuthenticatedUser, id: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id, organizationId: user.organizationId, userId: user.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        pendingActions: {
          where: { status: 'PENDING', expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!conversation) throw new NotFoundApiError('CONVERSATION_NOT_FOUND', 'This conversation could not be found.');
    return conversation;
  }

  async createConversation(user: AuthenticatedUser) {
    return this.prisma.aiConversation.create({
      data: { organizationId: user.organizationId, userId: user.id },
    });
  }

  /**
   * Stages a write tool call instead of running it. This is the actual
   * confirm-before-write boundary: nothing under WRITE_TOOLS ever reaches
   * AiToolsService.createTask/createFollowup except via confirmAction()
   * below, which only fires from an authenticated, explicit user request —
   * never as a side effect of the model's own output.
   */
  private async proposeAction(user: AuthenticatedUser, conversationId: string, name: string, input: Record<string, unknown>) {
    const action = await this.prisma.aiPendingAction.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        conversationId,
        toolName: name,
        input: input as Prisma.InputJsonValue,
        summary: summarizeAction(name, input),
        expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MINUTES * 60 * 1000),
      },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ai_action_proposed',
      entityType: 'ai_pending_action',
      entityId: action.id,
      after: action,
      metadata: { toolName: name, summary: action.summary },
    });
    return {
      status: 'pending_confirmation',
      actionId: action.id,
      summary: action.summary,
      message: 'Prepared — waiting for the user to confirm this in the app before anything is created.',
    };
  }

  private async executeTool(user: AuthenticatedUser, conversationId: string, name: string, input: Record<string, unknown>) {
    if (WRITE_TOOLS.has(name)) {
      if (!user.permissions.includes('ai.actions')) {
        return { error: 'This user does not have permission to let the AI create records (ai.actions).' };
      }
      return this.proposeAction(user, conversationId, name, input);
    }

    const requiredPermission = READ_TOOL_PERMISSIONS[name];
    if (requiredPermission && !user.permissions.includes(requiredPermission)) {
      return { error: `This user does not have permission to view this information (${requiredPermission}).` };
    }

    const clientName = input.clientName ? String(input.clientName) : undefined;
    switch (name) {
      case 'get_today_tasks':
        return this.tools.getTodayTasks(user.organizationId, user.id);
      case 'get_overdue_tasks':
        return this.tools.getOverdueTasks(user.organizationId, user.id);
      case 'get_client_summary':
        return this.tools.getClientSummary(user.organizationId, String(input.clientName ?? ''));
      case 'get_compliance_events':
        return this.tools.getComplianceEvents(
          user.organizationId,
          input.status ? String(input.status) : undefined,
          clientName,
        );
      case 'get_gst_status':
        return this.tools.getGstStatus(user.organizationId, clientName);
      case 'get_tds_status':
        return this.tools.getTdsStatus(user.organizationId, clientName);
      case 'get_itr_status':
        return this.tools.getItrStatus(user.organizationId, clientName);
      case 'get_roc_status':
        return this.tools.getRocStatus(user.organizationId, clientName);
      case 'get_billing_summary':
        return this.tools.getBillingSummary(user.organizationId, clientName);
      case 'get_my_leave_requests':
        return this.tools.getMyLeaveRequests(user);
      case 'get_my_attendance_status':
        return this.tools.getMyAttendanceStatus(user.organizationId, user);
      case 'get_document_requests_status':
        return this.tools.getDocumentRequestsStatus(user.organizationId, clientName);
      case 'get_udin_records':
        return this.tools.getUdinRecords(user.organizationId, clientName);
      case 'get_notices':
        return this.tools.getNotices(user.organizationId, clientName);
      case 'search_knowledge_base':
        return this.tools.searchKnowledgeBase(user.organizationId, String(input.query ?? ''));
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  /** Runs the staged tool call for real. Only reachable via an explicit, authenticated user confirm click. */
  async confirmAction(user: AuthenticatedUser, actionId: string) {
    const action = await this.prisma.aiPendingAction.findFirst({
      where: { id: actionId, organizationId: user.organizationId, userId: user.id },
    });
    if (!action) throw new NotFoundApiError('AI_ACTION_NOT_FOUND', 'This pending action could not be found.');
    if (action.status !== 'PENDING') {
      throw new ConflictApiError('AI_ACTION_NOT_PENDING', `This action is already ${action.status.toLowerCase()}.`);
    }
    if (!user.permissions.includes('ai.actions')) {
      throw new ForbiddenApiError('AI_ACTIONS_FORBIDDEN', 'You do not have permission to confirm AI-proposed actions.');
    }
    if (action.expiresAt < new Date()) {
      await this.prisma.aiPendingAction.update({ where: { id: action.id }, data: { status: 'EXPIRED', resolvedAt: new Date() } });
      throw new ConflictApiError('AI_ACTION_EXPIRED', 'This proposed action expired. Ask the assistant to prepare it again.');
    }

    const input = action.input as Record<string, unknown>;
    let result: Record<string, unknown>;
    let resultEntityType: string | undefined;
    switch (action.toolName) {
      case 'create_task':
        result = await this.tools.createTask(user, {
          title: String(input.title ?? ''),
          clientName: input.clientName ? String(input.clientName) : undefined,
          dueDate: input.dueDate ? String(input.dueDate) : undefined,
          priority: input.priority ? String(input.priority) : undefined,
        });
        resultEntityType = 'task';
        break;
      case 'create_followup':
        result = await this.tools.createFollowup(user, {
          clientName: String(input.clientName ?? ''),
          reason: String(input.reason ?? ''),
          date: input.date ? String(input.date) : undefined,
        });
        resultEntityType = 'task';
        break;
      case 'create_leave_request':
        result = await this.tools.createLeaveRequest(user, {
          leaveType: String(input.leaveType ?? 'CASUAL'),
          startDate: String(input.startDate ?? ''),
          endDate: String(input.endDate ?? ''),
          days: Number(input.days ?? 1),
          reason: input.reason ? String(input.reason) : undefined,
        });
        resultEntityType = 'leave_request';
        break;
      case 'create_document_request':
        result = await this.tools.createDocumentRequest(user, {
          clientName: String(input.clientName ?? ''),
          title: String(input.title ?? ''),
          items: Array.isArray(input.items) ? input.items.map(String) : undefined,
        });
        resultEntityType = 'document_request';
        break;
      default:
        result = { error: `Unknown tool: ${action.toolName}` };
    }

    const resultEntityId =
      ['taskId', 'leaveRequestId', 'documentRequestId']
        .map((key) => (key in result && typeof result[key] === 'string' ? (result[key] as string) : undefined))
        .find((id) => id !== undefined) ?? undefined;
    const updated = await this.prisma.aiPendingAction.update({
      where: { id: action.id },
      data: { status: 'CONFIRMED', resolvedAt: new Date(), resultEntityType: 'error' in result ? undefined : resultEntityType, resultEntityId },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ai_action_confirmed',
      entityType: 'ai_pending_action',
      entityId: action.id,
      before: action,
      after: updated,
      metadata: { toolName: action.toolName, result },
    });
    return result;
  }

  async cancelAction(user: AuthenticatedUser, actionId: string) {
    const action = await this.prisma.aiPendingAction.findFirst({
      where: { id: actionId, organizationId: user.organizationId, userId: user.id },
    });
    if (!action) throw new NotFoundApiError('AI_ACTION_NOT_FOUND', 'This pending action could not be found.');
    if (action.status !== 'PENDING') {
      throw new ConflictApiError('AI_ACTION_NOT_PENDING', `This action is already ${action.status.toLowerCase()}.`);
    }

    const updated = await this.prisma.aiPendingAction.update({
      where: { id: action.id },
      data: { status: 'CANCELLED', resolvedAt: new Date() },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ai_action_cancelled',
      entityType: 'ai_pending_action',
      entityId: action.id,
      before: action,
      after: updated,
      metadata: { toolName: action.toolName },
    });
    return { cancelled: true };
  }

  async sendMessage(user: AuthenticatedUser, conversationId: string, text: string, source?: 'TEXT' | 'VOICE') {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId, userId: user.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundApiError('CONVERSATION_NOT_FOUND', 'This conversation could not be found.');

    await this.prisma.aiMessage.create({ data: { conversationId, role: 'USER', content: text, source } });

    if (!this.isConfigured()) {
      const notice =
        'AI Copilot is not configured yet in this environment (AI_API_KEY is not set), so I cannot generate a real response. This is not a fake answer — the integration is fully built and will work as soon as an API key is configured.';
      const saved = await this.prisma.aiMessage.create({ data: { conversationId, role: 'ASSISTANT', content: notice, source } });
      return saved;
    }

    const genAI = new GoogleGenAI({ apiKey: this.config.get<string>('ai.apiKey') });
    const model = this.config.get<string>('ai.model') || 'gemini-flash-latest';

    const history: Content[] = conversation.messages
      .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
      .map((m) => ({ role: m.role === 'USER' ? 'user' : 'model', parts: [{ text: m.content }] }));
    const contents: Content[] = [...history, { role: 'user', parts: [{ text }] }];

    const toolsUsed: string[] = [];
    let finalText = '';

    for (let round = 0; round < 4; round++) {
      let response;
      try {
        response = await genAI.models.generateContent({
          model,
          contents,
          config: { systemInstruction: SYSTEM_PROMPT, tools: [{ functionDeclarations: TOOLS }] },
        });
      } catch (err) {
        this.logger.error(`Gemini request failed: ${String(err)}`);
        finalText = 'I ran into a problem reaching the AI provider just now. Please try again in a moment.';
        break;
      }

      const calls = response.functionCalls;
      if (!calls || calls.length === 0) {
        finalText = response.text ?? '';
        break;
      }

      // Echo back the model's full turn (not just a reconstructed functionCall
      // part) — newer Gemini models attach a thoughtSignature to tool-call
      // turns that must round-trip unchanged or the next call is rejected.
      const modelContent = response.candidates?.[0]?.content;
      contents.push(modelContent ?? { role: 'model', parts: calls.map((c) => ({ functionCall: c }) as Part) });

      const responseParts: Part[] = [];
      for (const call of calls) {
        if (!call.name) continue;
        toolsUsed.push(call.name);
        const result = await this.executeTool(user, conversationId, call.name, call.args ?? {});
        responseParts.push({ functionResponse: { name: call.name, response: { output: result } } });
      }
      contents.push({ role: 'user', parts: responseParts });
    }

    if (!finalText) {
      finalText = 'I was not able to finish that request. Please try rephrasing your question.';
    }

    const saved = await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: finalText,
        toolName: toolsUsed.length > 0 ? toolsUsed.join(',') : undefined,
        source,
      },
    });

    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        title: conversation.title ?? text.slice(0, 60),
      },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'ai_query',
      entityType: 'ai_conversation',
      entityId: conversationId,
      metadata: { toolsUsed },
    });

    return saved;
  }
}
