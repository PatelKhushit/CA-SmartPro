import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { ListDocumentsDto } from './dto/list-documents.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

// Hard ceiling independent of the configured business limit (defense in
// depth against oversized payloads before DocumentsService even runs).
const UPLOAD_CEILING_BYTES = 25 * 1024 * 1024;

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @RequirePermissions('documents.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListDocumentsDto) {
    return this.documentsService.list(user.organizationId, query);
  }

  // Public: the token itself is the credential (signed, single-purpose,
  // short-lived — see storage/signed-url.util.ts), so this route
  // intentionally bypasses JWT auth the same way an S3 presigned URL would.
  // Must be registered before ':id' below, or Express would match "file" as
  // an :id param first.
  @Public()
  @Get('file')
  @Header('Cache-Control', 'private, no-store')
  async serveFile(@Query('token') token: string, @Res({ passthrough: true }) res: Response) {
    const { stream, version } = await this.documentsService.resolveSignedDownload(token);
    // eslint-disable-next-line no-control-regex
    const asciiFallback = version.originalFilename.replace(/[^\x20-\x7E]|["\\]/g, '_');
    res.set({
      'Content-Type': version.mimeType,
      'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(version.originalFilename)}`,
      'Content-Length': version.sizeBytes.toString(),
    });
    return new StreamableFile(stream);
  }

  @RequirePermissions('documents.view')
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentsService.get(user.organizationId, id);
  }

  @RequirePermissions('documents.upload')
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_CEILING_BYTES } }))
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentsService.create(user, dto, file);
  }

  @RequirePermissions('documents.upload')
  @Post(':id/versions')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_CEILING_BYTES } }))
  addVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.documentsService.addVersion(user, id, file);
  }

  @RequirePermissions('documents.edit')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(user, id, dto);
  }

  @RequirePermissions('documents.delete')
  @Delete(':id')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentsService.archive(user, id);
  }

  @RequirePermissions('documents.view')
  @Post(':id/versions/:versionId/download-link')
  createDownloadLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.documentsService.createDownloadLink(user, id, versionId);
  }
}
