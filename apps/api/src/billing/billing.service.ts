import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ApiError, ConflictApiError, NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateFeePlanDto, GenerateInvoiceFromFeePlanDto, ListFeePlansDto, UpdateFeePlanDto } from './dto/fee-plan.dto.js';
import type { CreateInvoiceDto, ListInvoicesDto, UpdateInvoiceDto } from './dto/invoice.dto.js';
import type { CreatePaymentDto, ListPaymentsDto } from './dto/payment.dto.js';

const FEE_PLAN_INCLUDE = {
  client: { select: { id: true, displayName: true, clientCode: true } },
} satisfies Prisma.FeePlanInclude;

const INVOICE_INCLUDE = {
  client: { select: { id: true, displayName: true, clientCode: true, pan: true, gstin: true } },
  feePlan: { select: { id: true, name: true } },
  createdBy: { select: { id: true, fullName: true } },
  lineItems: true,
  payments: { orderBy: { paymentDate: 'desc' as const } },
} satisfies Prisma.InvoiceInclude;

const PAYMENT_INCLUDE = {
  client: { select: { id: true, displayName: true, clientCode: true } },
  invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
  recordedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.PaymentInclude;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // --- Summary ---

  async summary(organizationId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeFeePlans, openInvoices, overdueCount, paidThisMonth] = await Promise.all([
      this.prisma.feePlan.count({ where: { organizationId, isActive: true } }),
      this.prisma.invoice.findMany({
        where: { organizationId, status: { in: ['SENT', 'PARTIALLY_PAID'] } },
        select: { totalAmount: true, amountPaid: true },
      }),
      this.prisma.invoice.count({
        where: { organizationId, status: { in: ['SENT', 'PARTIALLY_PAID'] }, dueDate: { lt: now } },
      }),
      this.prisma.payment.aggregate({
        where: { organizationId, paymentDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    const totalOutstanding = openInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.amountPaid)), 0);

    return {
      activeFeePlans,
      outstandingInvoices: openInvoices.length,
      totalOutstanding: round2(totalOutstanding),
      overdueInvoices: overdueCount,
      collectedThisMonth: Number(paidThisMonth._sum.amount ?? 0),
    };
  }

  // --- Fee Plans ---

  async listFeePlans(organizationId: string, query: ListFeePlansDto) {
    const where: Prisma.FeePlanWhereInput = {
      organizationId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { client: { displayName: { contains: query.search, mode: 'insensitive' } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.feePlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: FEE_PLAN_INCLUDE,
      }),
      this.prisma.feePlan.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  private async findOwnedFeePlan(organizationId: string, id: string) {
    const plan = await this.prisma.feePlan.findFirst({ where: { id, organizationId }, include: FEE_PLAN_INCLUDE });
    if (!plan) throw new NotFoundApiError('FEE_PLAN_NOT_FOUND', 'This fee plan could not be found.');
    return plan;
  }

  async createFeePlan(user: AuthenticatedUser, dto: CreateFeePlanDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');

    const created = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.feePlan.create({
        data: {
          organizationId: user.organizationId,
          clientId: dto.clientId,
          name: dto.name,
          amount: dto.amount,
          frequency: dto.frequency,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          notes: dto.notes,
          createdByUserId: user.id,
        },
      });
      await this.audit.log(
        { organizationId: user.organizationId, userId: user.id, action: 'fee_plan_created', entityType: 'fee_plan', entityId: plan.id, after: plan },
        tx,
      );
      return plan;
    });
    return this.findOwnedFeePlan(user.organizationId, created.id);
  }

  async updateFeePlan(user: AuthenticatedUser, id: string, dto: UpdateFeePlanDto) {
    const before = await this.findOwnedFeePlan(user.organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      const after = await tx.feePlan.update({
        where: { id },
        data: {
          name: dto.name,
          amount: dto.amount,
          frequency: dto.frequency,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          isActive: dto.isActive,
          notes: dto.notes,
        },
      });
      await this.audit.log(
        { organizationId: user.organizationId, userId: user.id, action: 'fee_plan_updated', entityType: 'fee_plan', entityId: id, before, after },
        tx,
      );
    });
    return this.findOwnedFeePlan(user.organizationId, id);
  }

  async generateInvoiceFromFeePlan(user: AuthenticatedUser, feePlanId: string, dto: GenerateInvoiceFromFeePlanDto) {
    const plan = await this.findOwnedFeePlan(user.organizationId, feePlanId);
    return this.createInvoice(user, {
      clientId: plan.clientId,
      feePlanId: plan.id,
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      lineItems: [{ description: plan.name, quantity: 1, unitPrice: Number(plan.amount) }],
    });
  }

  // --- Invoices ---

  private async nextInvoiceNumber(organizationId: string): Promise<string> {
    const count = await this.prisma.invoice.count({ where: { organizationId } });
    return `INV-${(count + 1).toString().padStart(4, '0')}`;
  }

  async listInvoices(organizationId: string, query: ListInvoicesDto) {
    const where: Prisma.InvoiceWhereInput = {
      organizationId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.view === 'overdue' ? { status: { in: ['SENT', 'PARTIALLY_PAID'] }, dueDate: { lt: new Date() } } : {}),
      ...(query.search
        ? {
            OR: [
              { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
              { client: { displayName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { issueDate: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: INVOICE_INCLUDE,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  private async findOwnedInvoice(organizationId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, organizationId }, include: INVOICE_INCLUDE });
    if (!invoice) throw new NotFoundApiError('INVOICE_NOT_FOUND', 'This invoice could not be found.');
    return invoice;
  }

  async getInvoice(organizationId: string, id: string) {
    return this.findOwnedInvoice(organizationId, id);
  }

  private computeTotals(lineItems: { description: string; quantity?: number; unitPrice: number }[], taxAmount: number) {
    const items = lineItems.map((li) => ({ ...li, quantity: li.quantity ?? 1, amount: round2((li.quantity ?? 1) * li.unitPrice) }));
    const subtotal = round2(items.reduce((sum, li) => sum + li.amount, 0));
    return { items, subtotal, totalAmount: round2(subtotal + taxAmount) };
  }

  async createInvoice(user: AuthenticatedUser, dto: CreateInvoiceDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');

    if (dto.feePlanId) {
      const plan = await this.prisma.feePlan.findFirst({ where: { id: dto.feePlanId, organizationId: user.organizationId, clientId: dto.clientId } });
      if (!plan) throw new NotFoundApiError('FEE_PLAN_NOT_FOUND', 'This fee plan could not be found for this client.');
    }

    const taxAmount = dto.taxAmount ?? 0;
    const { items, subtotal, totalAmount } = this.computeTotals(dto.lineItems, taxAmount);

    for (let attempt = 0; attempt < 3; attempt++) {
      const invoiceNumber = await this.nextInvoiceNumber(user.organizationId);
      try {
        const created = await this.prisma.$transaction(async (tx) => {
          const invoice = await tx.invoice.create({
            data: {
              organizationId: user.organizationId,
              clientId: dto.clientId,
              feePlanId: dto.feePlanId,
              invoiceNumber,
              issueDate: new Date(dto.issueDate),
              dueDate: new Date(dto.dueDate),
              subtotal,
              taxAmount,
              totalAmount,
              createdByUserId: user.id,
              lineItems: { createMany: { data: items.map((li) => ({ description: li.description, quantity: li.quantity, unitPrice: li.unitPrice, amount: li.amount })) } },
            },
          });
          await this.audit.log(
            {
              organizationId: user.organizationId,
              userId: user.id,
              action: 'invoice_created',
              entityType: 'invoice',
              entityId: invoice.id,
              after: invoice,
              metadata: { invoiceNumber, totalAmount },
            },
            tx,
          );
          return invoice;
        });
        return this.findOwnedInvoice(user.organizationId, created.id);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue; // race on auto-generated number — retry
        throw err;
      }
    }
    throw new ConflictApiError('INVOICE_NUMBER_CONFLICT', 'Could not allocate an invoice number. Please retry.');
  }

  async updateInvoice(user: AuthenticatedUser, id: string, dto: UpdateInvoiceDto) {
    const existing = await this.findOwnedInvoice(user.organizationId, id);

    if (dto.lineItems || dto.taxAmount !== undefined) {
      if (existing.status !== 'DRAFT') {
        throw new ApiError('INVOICE_NOT_EDITABLE', 'Only draft invoices can have their line items or tax changed.');
      }
    }
    if (dto.status === 'CANCELLED' && Number(existing.amountPaid) > 0) {
      throw new ApiError('INVOICE_HAS_PAYMENTS', 'This invoice has recorded payments and cannot be cancelled — remove the payments first.');
    }

    await this.prisma.$transaction(async (tx) => {
      let subtotal = existing.subtotal;
      let totalAmount = existing.totalAmount;
      const taxAmount = dto.taxAmount ?? existing.taxAmount;

      if (dto.lineItems) {
        const computed = this.computeTotals(dto.lineItems, Number(taxAmount));
        subtotal = new Prisma.Decimal(computed.subtotal);
        totalAmount = new Prisma.Decimal(computed.totalAmount);
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
        await tx.invoiceLineItem.createMany({
          data: computed.items.map((li) => ({ invoiceId: id, description: li.description, quantity: li.quantity, unitPrice: li.unitPrice, amount: li.amount })),
        });
      } else if (dto.taxAmount !== undefined) {
        totalAmount = new Prisma.Decimal(round2(Number(existing.subtotal) + dto.taxAmount));
      }

      const after = await tx.invoice.update({
        where: { id },
        data: {
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: dto.status,
          subtotal,
          taxAmount,
          totalAmount,
          notes: dto.notes,
        },
      });
      await this.audit.log(
        { organizationId: user.organizationId, userId: user.id, action: 'invoice_updated', entityType: 'invoice', entityId: id, before: existing, after, metadata: dto.status ? { status: dto.status } : undefined },
        tx,
      );
    });

    return this.findOwnedInvoice(user.organizationId, id);
  }

  // --- Payments ---

  async listPayments(organizationId: string, query: ListPaymentsDto) {
    const where: Prisma.PaymentWhereInput = {
      organizationId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.search
        ? {
            OR: [
              { referenceNumber: { contains: query.search, mode: 'insensitive' } },
              { client: { displayName: { contains: query.search, mode: 'insensitive' } } },
              { invoice: { invoiceNumber: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: PAYMENT_INCLUDE,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async createPayment(user: AuthenticatedUser, dto: CreatePaymentDto) {
    const invoice = await this.findOwnedInvoice(user.organizationId, dto.invoiceId);
    if (!['SENT', 'PARTIALLY_PAID'].includes(invoice.status)) {
      throw new ApiError('INVOICE_NOT_PAYABLE', 'Payments can only be recorded against a sent invoice.');
    }
    const remaining = round2(Number(invoice.totalAmount) - Number(invoice.amountPaid));
    if (dto.amount > remaining + 0.01) {
      throw new ApiError('PAYMENT_EXCEEDS_BALANCE', `This payment exceeds the outstanding balance of ${remaining}.`);
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          organizationId: user.organizationId,
          clientId: invoice.clientId,
          invoiceId: invoice.id,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          method: dto.method,
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          recordedByUserId: user.id,
        },
      });

      const newAmountPaid = round2(Number(invoice.amountPaid) + dto.amount);
      const newStatus = newAmountPaid >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';
      await tx.invoice.update({ where: { id: invoice.id }, data: { amountPaid: newAmountPaid, status: newStatus } });

      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'payment_recorded',
          entityType: 'payment',
          entityId: created.id,
          after: created,
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, resultingInvoiceStatus: newStatus },
        },
        tx,
      );
      return created;
    });

    return this.prisma.payment.findFirstOrThrow({ where: { id: payment.id }, include: PAYMENT_INCLUDE });
  }

  async removePayment(user: AuthenticatedUser, id: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!payment) throw new NotFoundApiError('PAYMENT_NOT_FOUND', 'This payment could not be found.');
    const invoice = await this.findOwnedInvoice(user.organizationId, payment.invoiceId);

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id } });
      const newAmountPaid = round2(Number(invoice.amountPaid) - Number(payment.amount));
      const newStatus = newAmountPaid <= 0 ? 'SENT' : newAmountPaid < Number(invoice.totalAmount) ? 'PARTIALLY_PAID' : 'PAID';
      await tx.invoice.update({ where: { id: invoice.id }, data: { amountPaid: Math.max(newAmountPaid, 0), status: newStatus } });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'payment_removed',
          entityType: 'payment',
          entityId: id,
          before: payment,
          metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
        },
        tx,
      );
    });
    return { message: 'Payment removed.' };
  }
}
