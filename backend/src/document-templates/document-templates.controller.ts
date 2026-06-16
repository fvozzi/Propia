import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { GenerateDocumentTemplateDto } from './dto/generate-document-template.dto';
import { DocumentTemplatesService } from './document-templates.service';

@UseGuards(JwtAuthGuard)
@Controller('document-templates')
export class DocumentTemplatesController {
  constructor(
    private readonly documentTemplatesService: DocumentTemplatesService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.documentTemplatesService.findAll(user);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('templateFile', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  create(
    @Body() dto: CreateDocumentTemplateDto,
    @UploadedFile() templateFile: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentTemplatesService.create(dto, user, templateFile);
  }

  @Post(':id/generate-docx')
  async generateDocx(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateDocumentTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const result = await this.documentTemplatesService.generateDocxBuffer(
      id,
      dto,
      user,
    );
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.outputFileName}"`,
    );
    response.send(result.docxBuffer);
  }

  @Post(':id/generate-pdf')
  async generatePdf(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateDocumentTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const result = await this.documentTemplatesService.generatePdfBuffer(
      id,
      dto,
      user,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.outputFileName}"`,
    );
    response.send(result.pdfBuffer);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentTemplatesService.remove(id, user);
  }
}
