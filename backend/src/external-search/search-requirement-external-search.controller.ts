import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DismissRequirementPortalMatchDto } from './dto/dismiss-requirement-portal-match.dto';
import { QueryRequirementPortalMatchesDto } from './dto/query-requirement-portal-matches.dto';
import { ExternalSearchService } from './external-search.service';

@UseGuards(JwtAuthGuard)
@Controller('search-requirements/:requirementId')
export class SearchRequirementExternalSearchController {
  constructor(private readonly externalSearchService: ExternalSearchService) {}

  @Post('run-external-search')
  runExternalSearch(
    @Param('requirementId', ParseIntPipe) requirementId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalSearchService.runExternalSearchForRequirement(requirementId, user);
  }

  @Get('external-matches')
  findMatches(
    @Param('requirementId', ParseIntPipe) requirementId: number,
    @Query() query: QueryRequirementPortalMatchesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalSearchService.listRequirementPortalMatches(requirementId, query, user);
  }

  @Get('search-runs')
  findRuns(
    @Param('requirementId', ParseIntPipe) requirementId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalSearchService.listSearchRunsForRequirement(requirementId, user);
  }

  @Post('external-matches/:id/dismiss')
  dismissMatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DismissRequirementPortalMatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalSearchService.dismissRequirementPortalMatch(id, dto, user);
  }

  @Post('external-matches/:id/restore')
  restoreMatch(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.externalSearchService.restoreRequirementPortalMatch(id, user);
  }

  @Post('external-matches/:id/convert-to-candidate')
  convertToCandidate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalSearchService.convertMatchToCandidate(id, user);
  }

  @Post('external-matches/:id/create-activity')
  createActivity(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.externalSearchService.createActivityFromMatch(id, user);
  }
}
