import { Body, Controller, Delete, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BuyerPropertyCandidatesService } from './buyer-property-candidates.service';
import { CreateBuyerPropertyCandidateDto } from './dto/create-buyer-property-candidate.dto';
import { ShareBuyerPropertyCandidateDto } from './dto/share-buyer-property-candidate.dto';
import { UpdateBuyerPropertyCandidateDto } from './dto/update-buyer-property-candidate.dto';

@UseGuards(JwtAuthGuard)
@Controller('buyer-property-candidates')
export class BuyerPropertyCandidatesController {
  constructor(private readonly buyerPropertyCandidatesService: BuyerPropertyCandidatesService) {}

  @Post()
  create(@Body() dto: CreateBuyerPropertyCandidateDto, @CurrentUser() user: AuthenticatedUser) {
    return this.buyerPropertyCandidatesService.create(dto, user);
  }

  @Patch(':id/share')
  share(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ShareBuyerPropertyCandidateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.buyerPropertyCandidatesService.share(id, dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBuyerPropertyCandidateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.buyerPropertyCandidatesService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.buyerPropertyCandidatesService.remove(id, user);
  }
}
