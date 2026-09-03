import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { CreateFeePlanDto, GenerateInvoiceFromFeePlanDto, ListFeePlansDto, UpdateFeePlanDto } from './dto/fee-plan.dto.js';
import { CreateInvoiceDto, ListInvoicesDto, UpdateInvoiceDto } from './dto/invoice.dto.js';
import { CreatePaymentDto, ListPaymentsDto } from './dto/payment.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @RequirePermissions('payments.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.summary(user.organizationId);
  }

  // --- Fee Plans ---

  @RequirePermissions('payments.view')
  @Get('fee-plans')
  listFeePlans(@CurrentUser() user: AuthenticatedUser, @Query() query: ListFeePlansDto) {
    return this.billingService.listFeePlans(user.organizationId, query);
  }

  @RequirePermissions('payments.manage')
  @Post('fee-plans')
  createFeePlan(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFeePlanDto) {
    return this.billingService.createFeePlan(user, dto);
  }

  @RequirePermissions('payments.manage')
  @Patch('fee-plans/:id')
  updateFeePlan(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateFeePlanDto) {
    return this.billingService.updateFeePlan(user, id, dto);
  }

  @RequirePermissions('payments.manage')
  @Post('fee-plans/:id/generate-invoice')
  generateInvoice(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: GenerateInvoiceFromFeePlanDto) {
    return this.billingService.generateInvoiceFromFeePlan(user, id, dto);
  }

  // --- Invoices ---

  @RequirePermissions('payments.view')
  @Get('invoices')
  listInvoices(@CurrentUser() user: AuthenticatedUser, @Query() query: ListInvoicesDto) {
    return this.billingService.listInvoices(user.organizationId, query);
  }

  @RequirePermissions('payments.view')
  @Get('invoices/:id')
  getInvoice(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.billingService.getInvoice(user.organizationId, id);
  }

  @RequirePermissions('payments.manage')
  @Post('invoices')
  createInvoice(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInvoiceDto) {
    return this.billingService.createInvoice(user, dto);
  }

  @RequirePermissions('payments.manage')
  @Patch('invoices/:id')
  updateInvoice(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.billingService.updateInvoice(user, id, dto);
  }

  // --- Payments ---

  @RequirePermissions('payments.view')
  @Get('payments')
  listPayments(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPaymentsDto) {
    return this.billingService.listPayments(user.organizationId, query);
  }

  @RequirePermissions('payments.manage')
  @Post('payments')
  createPayment(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePaymentDto) {
    return this.billingService.createPayment(user, dto);
  }

  @RequirePermissions('payments.manage')
  @Delete('payments/:id')
  removePayment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.billingService.removePayment(user, id);
  }
}
