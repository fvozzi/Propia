import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppraisalRequestsService } from './appraisal-requests.service';
import { CreateAppraisalRequestDto } from './dto/create-appraisal-request.dto';
import { QueryAppraisalRequestsDto } from './dto/query-appraisal-requests.dto';
import { SubmitAppraisalRequestDto } from './dto/submit-appraisal-request.dto';
import { UpdateAppraisalRequestDto } from './dto/update-appraisal-request.dto';

@UseGuards(JwtAuthGuard)
@Controller('appraisal-requests')
export class AppraisalRequestsController {
  constructor(private readonly appraisalRequestsService: AppraisalRequestsService) {}

  @Post()
  create(@Body() dto: CreateAppraisalRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appraisalRequestsService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryAppraisalRequestsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appraisalRequestsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.appraisalRequestsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppraisalRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appraisalRequestsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.appraisalRequestsService.remove(id, user);
  }
}

@Controller('public/appraisal-requests')
export class PublicAppraisalRequestsController {
  constructor(private readonly appraisalRequestsService: AppraisalRequestsService) {}

  @Get(':token')
  findPublicByToken(@Param('token') token: string) {
    return this.appraisalRequestsService.findPublicByToken(token);
  }

  @Post(':token/submit')
  submit(@Param('token') token: string, @Body() dto: SubmitAppraisalRequestDto) {
    return this.appraisalRequestsService.submitPublic(token, dto);
  }
}
