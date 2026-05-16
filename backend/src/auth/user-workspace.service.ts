import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMembershipRole } from '../common/enums';
import { TeamMembership } from './team-membership.entity';
import { Team } from './team.entity';
import { User } from './user.entity';

@Injectable()
export class UserWorkspaceService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(TeamMembership)
    private readonly membershipsRepository: Repository<TeamMembership>,
  ) {}

  async ensurePersonalTeam(user: User, membershipRole = TeamMembershipRole.OWNER) {
    if (user.activeTeamId) {
      return user;
    }

    const team = await this.teamsRepository.save(
      this.teamsRepository.create({
        name: this.buildPersonalTeamName(user),
      }),
    );

    await this.membershipsRepository.save(
      this.membershipsRepository.create({
        teamId: team.id,
        userId: user.id,
        role: membershipRole,
      }),
    );

    user.activeTeamId = team.id;
    return this.usersRepository.save(user);
  }

  async ensureMembership(userId: number, teamId: number, role = TeamMembershipRole.MEMBER) {
    const existingMembership = await this.membershipsRepository.findOne({
      where: { userId, teamId },
    });

    if (existingMembership) {
      return existingMembership;
    }

    return this.membershipsRepository.save(
      this.membershipsRepository.create({
        userId,
        teamId,
        role,
      }),
    );
  }

  async setActiveTeam(userId: number, teamId: number) {
    const membership = await this.membershipsRepository.findOne({
      where: { userId, teamId },
    });

    if (!membership) {
      throw new NotFoundException('Equipo no encontrado para este usuario');
    }

    await this.usersRepository.update({ id: userId }, { activeTeamId: teamId });
  }

  async loadUserWithWorkspace(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
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

    return user;
  }

  private buildPersonalTeamName(user: Pick<User, 'name' | 'email'>) {
    const baseName = user.name?.trim() || user.email;
    return `${baseName} Team`;
  }
}
