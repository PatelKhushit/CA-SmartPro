import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { GstService } from '../gst/gst.service.js';
import { TdsService } from '../tds/tds.service.js';
import { ItrService } from '../itr/itr.service.js';
import { RocService } from '../roc/roc.service.js';
import { UdinService } from '../udin/udin.service.js';
import { NoticesService } from '../notices/notices.service.js';
import { BillingService } from '../billing/billing.service.js';
import type { ListInvoicesDto } from '../billing/dto/invoice.dto.js';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gst: GstService,
    private readonly tds: TdsService,
    private readonly itr: ItrService,
    private readonly roc: RocService,
    private readonly udin: UdinService,
    private readonly notices: NoticesService,
    private readonly billing: BillingService,
  ) {}

  async daily(organizationId: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const start = startOfDay(date);
    const end = endOfDay(date);

    const [completed, pending, overdue, followUps, tasks] = await Promise.all([
      this.prisma.task.count({
        where: { organizationId, status: 'COMPLETED', completedAt: { gte: start, lte: end } },
      }),
      this.prisma.task.count({
        where: { organizationId, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { gte: start, lte: end } },
      }),
      this.prisma.task.count({
        where: { organizationId, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: start } },
      }),
      this.prisma.task.count({
        where: { organizationId, deletedAt: null, category: 'FOLLOW_UP', dueDate: { gte: start, lte: end } },
      }),
      this.prisma.task.findMany({
        where: {
          organizationId,
          deletedAt: null,
          OR: [
            { status: 'COMPLETED', completedAt: { gte: start, lte: end } },
            { status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { gte: start, lte: end } },
          ],
        },
        include: {
          client: { select: { displayName: true } },
          assignedUser: { select: { fullName: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    return { date: start.toISOString().slice(0, 10), completed, pending, overdue, followUps, tasks };
  }

  async monthly(organizationId: string, monthStr?: string) {
    const ref = monthStr ? new Date(`${monthStr}-01`) : new Date();
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);

    const [completed, totalDue, complianceCompleted, complianceTotal, activeClients] = await Promise.all([
      this.prisma.task.count({ where: { organizationId, status: 'COMPLETED', completedAt: { gte: start, lte: end } } }),
      this.prisma.task.count({
        where: {
          organizationId,
          deletedAt: null,
          OR: [
            { status: 'COMPLETED', completedAt: { gte: start, lte: end } },
            { status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { gte: start, lte: end } },
          ],
        },
      }),
      this.prisma.complianceEvent.count({ where: { organizationId, status: 'COMPLETED', completedAt: { gte: start, lte: end } } }),
      this.prisma.complianceEvent.count({ where: { organizationId, dueDate: { gte: start, lte: end } } }),
      this.prisma.client.count({ where: { organizationId, status: 'ACTIVE', deletedAt: null } }),
    ]);

    return {
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      productivityPercent: totalDue === 0 ? 0 : Math.round((completed / totalDue) * 100),
      complianceHealthPercent: complianceTotal === 0 ? 0 : Math.round((complianceCompleted / complianceTotal) * 100),
      tasksCompleted: completed,
      tasksTotal: totalDue,
      complianceCompleted,
      complianceTotal,
      activeClients,
    };
  }

  async team(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, fullName: true, role: { select: { name: true } } },
    });

    const rows = await Promise.all(
      users.map(async (user) => {
        const [assigned, completed, overdue] = await Promise.all([
          this.prisma.task.count({ where: { organizationId, assignedUserId: user.id, deletedAt: null } }),
          this.prisma.task.count({ where: { organizationId, assignedUserId: user.id, status: 'COMPLETED' } }),
          this.prisma.task.count({
            where: {
              organizationId,
              assignedUserId: user.id,
              deletedAt: null,
              status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
              dueDate: { lt: startOfDay(new Date()) },
            },
          }),
        ]);
        return {
          userId: user.id,
          fullName: user.fullName,
          role: user.role.name,
          assigned,
          completed,
          overdue,
          completionRate: assigned === 0 ? 0 : Math.round((completed / assigned) * 100),
        };
      }),
    );

    return rows;
  }

  async client(organizationId: string, clientId: string) {
    const [taskTotal, taskCompleted, taskOverdue, complianceTotal, complianceCompleted, complianceOverdue, invoices] = await Promise.all([
      this.prisma.task.count({ where: { organizationId, clientId, deletedAt: null } }),
      this.prisma.task.count({ where: { organizationId, clientId, status: 'COMPLETED' } }),
      this.prisma.task.count({
        where: { organizationId, clientId, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: startOfDay(new Date()) } },
      }),
      this.prisma.complianceEvent.count({ where: { organizationId, clientId } }),
      this.prisma.complianceEvent.count({ where: { organizationId, clientId, status: 'COMPLETED' } }),
      this.prisma.complianceEvent.count({ where: { organizationId, clientId, status: 'OVERDUE' } }),
      this.prisma.invoice.findMany({ where: { organizationId, clientId }, select: { totalAmount: true, amountPaid: true, status: true } }),
    ]);

    const outstandingInvoices = invoices.filter((i) => i.status === 'SENT' || i.status === 'PARTIALLY_PAID');
    const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.amountPaid)), 0);

    return {
      tasks: { total: taskTotal, completed: taskCompleted, overdue: taskOverdue },
      compliance: {
        total: complianceTotal,
        completed: complianceCompleted,
        overdue: complianceOverdue,
        healthPercent: complianceTotal === 0 ? 100 : Math.round((complianceCompleted / complianceTotal) * 100),
      },
      billing: { totalInvoices: invoices.length, outstandingInvoices: outstandingInvoices.length, outstandingAmount: outstandingAmount.toFixed(2) },
    };
  }

  /** Firm-wide compliance health across every tax/regulatory module — reuses each module's own summary() so this can never disagree with that module's own page. */
  async compliance(organizationId: string) {
    const [gst, tds, itr, roc, udin, notices] = await Promise.all([
      this.gst.summary(organizationId),
      this.tds.summary(organizationId),
      this.itr.summary(organizationId),
      this.roc.summary(organizationId),
      this.udin.summary(organizationId),
      this.notices.summary(organizationId),
    ]);
    return { gst, tds, itr, roc, udin, notices };
  }

  async billingReport(organizationId: string) {
    const [summary, overdue] = await Promise.all([
      this.billing.summary(organizationId),
      this.billing.listInvoices(organizationId, { view: 'overdue', page: 1, pageSize: 10 } as ListInvoicesDto),
    ]);
    return {
      ...summary,
      topOverdueInvoices: overdue.items.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        client: i.client.displayName,
        dueDate: i.dueDate.toISOString().slice(0, 10),
        balance: (Number(i.totalAmount) - Number(i.amountPaid)).toFixed(2),
      })),
    };
  }

  async dailyCsv(organizationId: string, dateStr?: string): Promise<string> {
    const report = await this.daily(organizationId, dateStr);
    const header = 'Title,Client,Assigned To,Priority,Status,Due Date\n';
    const rows = report.tasks
      .map((t) =>
        [t.title, t.client?.displayName ?? 'Internal', t.assignedUser?.fullName ?? 'Unassigned', t.priority, t.status, t.dueDate?.toISOString().slice(0, 10) ?? '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    return header + rows;
  }

  async dailyPdf(organizationId: string, dateStr?: string): Promise<Buffer> {
    const report = await this.daily(organizationId, dateStr);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    doc.fontSize(18).font('Helvetica-Bold').text('Daily Report', { align: 'left' });
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text(report.date);
    doc.moveDown(1);

    doc
      .fontSize(11)
      .fillColor('#000000')
      .text(`Completed: ${report.completed}    Pending: ${report.pending}    Overdue: ${report.overdue}    Follow-ups: ${report.followUps}`);
    doc.moveDown(1);

    const colX = [40, 210, 340, 440, 500];
    const colWidths = [170, 130, 100, 60, 55];
    const headerY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    ['Task', 'Client', 'Assigned To', 'Priority', 'Status'].forEach((label, i) => doc.text(label, colX[i], headerY, { width: colWidths[i] }));
    doc.moveDown(0.5);
    doc
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(9);
    for (const t of report.tasks) {
      if (doc.y > 760) doc.addPage();
      const rowY = doc.y;
      doc.text(t.title, colX[0], rowY, { width: colWidths[0] });
      doc.text(t.client?.displayName ?? 'Internal', colX[1], rowY, { width: colWidths[1] });
      doc.text(t.assignedUser?.fullName ?? 'Unassigned', colX[2], rowY, { width: colWidths[2] });
      doc.text(t.priority, colX[3], rowY, { width: colWidths[3] });
      doc.text(t.status, colX[4], rowY, { width: colWidths[4] });
      doc.moveDown(0.6);
    }
    if (report.tasks.length === 0) {
      doc.fillColor('#666666').text('No task activity for this day.');
    }

    doc.end();
    return done;
  }

  async monthlyExcel(organizationId: string, monthStr?: string): Promise<Buffer> {
    const report = await this.monthly(organizationId, monthStr);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Monthly Summary');
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.addRows([
      { metric: 'Month', value: report.month },
      { metric: 'Productivity %', value: report.productivityPercent },
      { metric: 'Compliance Health %', value: report.complianceHealthPercent },
      { metric: 'Tasks Completed', value: report.tasksCompleted },
      { metric: 'Tasks Total', value: report.tasksTotal },
      { metric: 'Compliance Completed', value: report.complianceCompleted },
      { metric: 'Compliance Total', value: report.complianceTotal },
      { metric: 'Active Clients', value: report.activeClients },
    ]);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async teamExcel(organizationId: string): Promise<Buffer> {
    const rows = await this.team(organizationId);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Team Report');
    sheet.columns = [
      { header: 'Team Member', key: 'fullName', width: 25 },
      { header: 'Role', key: 'role', width: 18 },
      { header: 'Assigned', key: 'assigned', width: 12 },
      { header: 'Completed', key: 'completed', width: 12 },
      { header: 'Overdue', key: 'overdue', width: 12 },
      { header: 'Completion Rate %', key: 'completionRate', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.addRows(rows);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
