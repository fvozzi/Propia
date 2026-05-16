import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get('users')
  listUsers() {
    return this.adminUsersService.listUsers();
  }

  @Get('teams')
  listTeams() {
    return this.adminUsersService.listTeams();
  }

  @Post('users')
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminUsersService.createUser(dto);
  }

  @Patch('users/:id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminUserDto) {
    return this.adminUsersService.updateUser(id, dto);
  }
}
