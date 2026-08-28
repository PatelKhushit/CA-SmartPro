import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { ListClientsDto } from './dto/list-clients.dto.js';
import { CreateClientContactDto, UpdateClientContactDto } from './dto/client-contact.dto.js';
import { CreateClientServiceDto, UpdateClientServiceDto } from './dto/client-service.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @RequirePermissions('clients.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListClientsDto) {
    return this.clientsService.list(user.organizationId, query);
  }

  @RequirePermissions('clients.view')
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.clientsService.get(user.organizationId, id);
  }

  @RequirePermissions('clients.create')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClientDto) {
    return this.clientsService.create(user, dto);
  }

  @RequirePermissions('clients.edit')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(user, id, dto);
  }

  @RequirePermissions('clients.delete')
  @Delete(':id')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.clientsService.archive(user, id);
  }

  @RequirePermissions('clients.edit')
  @Post(':id/contacts')
  addContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateClientContactDto,
  ) {
    return this.clientsService.addContact(user, id, dto);
  }

  @RequirePermissions('clients.edit')
  @Patch(':id/contacts/:contactId')
  updateContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateClientContactDto,
  ) {
    return this.clientsService.updateContact(user, id, contactId, dto);
  }

  @RequirePermissions('clients.edit')
  @Delete(':id/contacts/:contactId')
  removeContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.clientsService.removeContact(user, id, contactId);
  }

  @RequirePermissions('clients.edit')
  @Post(':id/services')
  addService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateClientServiceDto,
  ) {
    return this.clientsService.addService(user, id, dto);
  }

  @RequirePermissions('clients.edit')
  @Patch(':id/services/:serviceId')
  updateService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateClientServiceDto,
  ) {
    return this.clientsService.updateService(user, id, serviceId, dto);
  }

  @RequirePermissions('clients.edit')
  @Delete(':id/services/:serviceId')
  removeService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.clientsService.removeService(user, id, serviceId);
  }
}
