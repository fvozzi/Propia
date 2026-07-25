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
import { CreateContactDto } from './dto/create-contact.dto';
import { QueryContactsDto } from './dto/query-contacts.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactsService } from './contacts.service';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Body() dto: CreateContactDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryContactsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.findAll(query, user);
  }

  @Get('tags')
  findTags(@CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.findAvailableTags(user);
  }

  @Post('google/sync')
  syncGoogleContacts(@CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.syncGoogleContacts(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contactsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.remove(id, user);
  }
}
