import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, type Content, type FunctionDeclaration, type Part } from '@google/genai';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { NotFoundApiError } from '../common/errors/api-error.js';
import { AiToolsService } from './ai-tools.service.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

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
- You cannot execute database writes, send messages, or perform destructive actions — you are read-only in this version.
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
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tools: AiToolsService,
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
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundApiError('CONVERSATION_NOT_FOUND', 'This conversation could not be found.');
    return conversation;
  }

  async createConversation(user: AuthenticatedUser) {
    return this.prisma.aiConversation.create({
      data: { organizationId: user.organizationId, userId: user.id },
    });
  }

  private async executeTool(user: AuthenticatedUser, name: string, input: Record<string, unknown>) {
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
          input.clientName ? String(input.clientName) : undefined,
        );
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  async sendMessage(user: AuthenticatedUser, conversationId: string, text: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId, userId: user.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundApiError('CONVERSATION_NOT_FOUND', 'This conversation could not be found.');

    await this.prisma.aiMessage.create({ data: { conversationId, role: 'USER', content: text } });

    if (!this.isConfigured()) {
      const notice =
        'AI Copilot is not configured yet in this environment (AI_API_KEY is not set), so I cannot generate a real response. This is not a fake answer — the integration is fully built and will work as soon as an API key is configured.';
      const saved = await this.prisma.aiMessage.create({ data: { conversationId, role: 'ASSISTANT', content: notice } });
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
        const result = await this.executeTool(user, call.name, call.args ?? {});
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
      },
    });

    await this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        title: conversation.title ?? text.slice(0, 60),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'ai_query',
        entityType: 'ai_conversation',
        entityId: conversationId,
        metadata: { toolsUsed },
      },
    });

    return saved;
  }
}
