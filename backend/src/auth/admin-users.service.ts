import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppUserRole, TeamMembershipRole } from '../common/enums';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { GoogleCalendarConnection } from './google-calendar-connection.entity';
import { TeamMembership } from './team-membership.entity';
import { Team } from './team.entity';
import { UserWorkspaceService } from './user-workspace.service';
import { User } from './user.entity';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMembership)
    private readonly membershipsRepository: Repository<TeamMembership>,
    @InjectRepository(GoogleCalendarConnection)
    private readonly googleConnectionsRepository: Repository<GoogleCalendarConnection>,
    private readonly userWorkspaceService: UserWorkspaceService,
  ) {}

  async listUsers() {
    const users = await this.usersRepository.find({
      relations: {
        activeTeam: true,
        memberships: {
          team: true,
        },
      },
      order: {
        createdAt: 'ASC',
        memberships: {
          createdAt: 'ASC',
        },
      },
    });

    const googleConnections = await this.googleConnectionsRepository.find({
      where: { isActive: true },
    });
    const connectedUserIds = new Set(googleConnections.map((connection) => connection.userId));

    return users.map((user) => this.toAdminUser(user, connectedUserIds.has(user.id)));
  }

  async listTeams() {
    const teams = await this.teamsRepository.find({
      relations: {
        memberships: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      createdAt: team.createdAt,
      memberCount: team.memberships.length,
    }));
  }

  async createUser(dto: CreateAdminUserDto) {
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    let user = await this.usersRepository.save(
      this.usersRepository.create({
        email: dto.email.trim().toLowerCase(),
        name: dto.name.trim(),
        passwordHash,
        appRole: dto.appRole,
        activeTeamId: dto.activeTeamId ?? null,
      }),
    );

    if (dto.activeTeamId) {
      await this.userWorkspaceService.ensureMembership(
        user.id,
        dto.activeTeamId,
        TeamMembershipRole.MEMBER,
      );
      await this.userWorkspaceService.setActiveTeam(user.id, dto.activeTeamId);
    } else {
      user = await this.userWorkspaceService.ensurePersonalTeam(user, TeamMembershipRole.OWNER);
    }

    return this.findUserById(user.id);
  }

  async updateUser(id: number, dto: UpdateAdminUserDto) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.email && dto.email.trim().toLowerCase() !== user.email) {
      const emailInUse = await this.usersRepository.findOne({
        where: { email: dto.email.trim().toLowerCase() },
      });

      if (emailInUse && emailInUse.id !== user.id) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
    }

    if (dto.email) {
      user.email = dto.email.trim().toLowerCase();
    }

    if (dto.name) {
      user.name = dto.name.trim();
    }

    if (dto.appRole) {
      user.appRole = dto.appRole;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.usersRepository.save(user);

    if (dto.activeTeamId) {
      await this.userWorkspaceService.ensureMembership(
        user.id,
        dto.activeTeamId,
        TeamMembershipRole.MEMBER,
      );
      await this.userWorkspaceService.setActiveTeam(user.id, dto.activeTeamId);
    } else if (!user.activeTeamId) {
      await this.userWorkspaceService.ensurePersonalTeam(user, TeamMembershipRole.OWNER);
    }

    return this.findUserById(id);
  }

  private async findUserById(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: {
        activeTeam: true,
        memberships: {
          team: true,
        },
      },
      order: {
        memberships: {
          createdAt: 'ASC',
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const googleConnection = await this.googleConnectionsRepository.findOne({
      where: { userId: user.id, isActive: true },
    });

    return this.toAdminUser(user, Boolean(googleConnection));
  }

  private toAdminUser(user: User, googleCalendarConnected: boolean) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      appRole: user.appRole ?? AppUserRole.USER,
      activeTeamId: user.activeTeamId,
      activeTeamName: user.activeTeam?.name ?? null,
      googleCalendarConnected,
      createdAt: user.createdAt,
      memberships: (user.memberships ?? []).map((membership) => ({
        id: membership.team.id,
        name: membership.team.name,
        membershipRole: membership.role,
      })),
    };
  }
}
