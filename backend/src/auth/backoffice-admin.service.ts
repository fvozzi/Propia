import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { AccountStatus, UserStatus } from '../common/enums';
import { LoginEvent } from './login-event.entity';
import { Team } from './team.entity';
import { User } from './user.entity';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';

@Injectable()
export class BackofficeAdminService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(LoginEvent)
    private readonly loginEventsRepository: Repository<LoginEvent>,
  ) {}

  async getOverview() {
    const [accounts, users, successfulLogins7d, successfulLogins30d] = await Promise.all([
      this.teamsRepository.find(),
      this.usersRepository.find(),
      this.loginEventsRepository.count({
        where: {
          success: true,
          createdAt: MoreThanOrEqual(daysAgo(7)),
        },
      }),
      this.loginEventsRepository.count({
        where: {
          success: true,
          createdAt: MoreThanOrEqual(daysAgo(30)),
        },
      }),
    ]);

    return {
      accounts: {
        total: accounts.length,
        active: accounts.filter((account) => account.status === AccountStatus.ACTIVE).length,
        trial: accounts.filter((account) => account.status === AccountStatus.TRIAL).length,
        pastDue: accounts.filter((account) => account.status === AccountStatus.PAST_DUE).length,
        suspended: accounts.filter((account) => account.status === AccountStatus.SUSPENDED).length,
        cancelled: accounts.filter((account) => account.status === AccountStatus.CANCELLED).length,
      },
      users: {
        total: users.length,
        active: users.filter((user) => user.status === UserStatus.ACTIVE).length,
        pending: users.filter((user) => user.status === UserStatus.PENDING).length,
        disabled: users.filter((user) => user.status === UserStatus.DISABLED).length,
      },
      successfulLogins: {
        last7Days: successfulLogins7d,
        last30Days: successfulLogins30d,
      },
    };
  }

  async listAccounts() {
    const accounts = await this.teamsRepository.find({
      relations: {
        memberships: {
          user: true,
        },
      },
      order: {
        createdAt: 'ASC',
        memberships: {
          createdAt: 'ASC',
        },
      },
    });

    return accounts.map((account) => {
      const users = uniqueUsers(account.memberships.map((membership) => membership.user));
      const lastLoginAt = users
        .map((user) => user.lastLoginAt)
        .filter((value): value is Date => Boolean(value))
        .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

      return {
        id: account.id,
        name: account.name,
        status: account.status,
        planName: account.planName,
        trialEndsAt: account.trialEndsAt,
        paidUntil: account.paidUntil,
        maxUsers: account.maxUsers,
        suspendedAt: account.suspendedAt,
        suspensionReason: account.suspensionReason,
        createdAt: account.createdAt,
        memberCount: users.length,
        activeUsersCount: users.filter((user) => user.status === UserStatus.ACTIVE).length,
        pendingUsersCount: users.filter((user) => user.status === UserStatus.PENDING).length,
        disabledUsersCount: users.filter((user) => user.status === UserStatus.DISABLED).length,
        lastLoginAt,
      };
    });
  }

  async updateAccount(id: number, dto: UpdateAdminAccountDto) {
    const account = await this.teamsRepository.findOne({
      where: { id },
      relations: {
        memberships: {
          user: true,
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    if (dto.name) {
      account.name = dto.name.trim();
    }

    if (dto.status) {
      account.status = dto.status;
    }

    if ('planName' in dto) {
      account.planName = dto.planName?.trim() || null;
    }

    if ('trialEndsAt' in dto) {
      account.trialEndsAt = dto.trialEndsAt ? new Date(dto.trialEndsAt) : null;
    }

    if ('paidUntil' in dto) {
      account.paidUntil = dto.paidUntil ? new Date(dto.paidUntil) : null;
    }

    if ('maxUsers' in dto) {
      account.maxUsers = dto.maxUsers ?? null;
    }

    if ('suspensionReason' in dto) {
      account.suspensionReason = dto.suspensionReason?.trim() || null;
    }

    if (account.status === AccountStatus.SUSPENDED) {
      account.suspendedAt = account.suspendedAt ?? new Date();
    } else {
      account.suspendedAt = null;
      account.suspensionReason = null;
    }

    await this.teamsRepository.save(account);

    const [updatedAccount] = await this.listAccountsByIds([account.id]);
    return updatedAccount;
  }

  private async listAccountsByIds(ids: number[]) {
    const accounts = await this.teamsRepository.find({
      where: ids.map((id) => ({ id })),
      relations: {
        memberships: {
          user: true,
        },
      },
    });

    return accounts.map((account) => {
      const users = uniqueUsers(account.memberships.map((membership) => membership.user));
      const lastLoginAt = users
        .map((user) => user.lastLoginAt)
        .filter((value): value is Date => Boolean(value))
        .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

      return {
        id: account.id,
        name: account.name,
        status: account.status,
        planName: account.planName,
        trialEndsAt: account.trialEndsAt,
        paidUntil: account.paidUntil,
        maxUsers: account.maxUsers,
        suspendedAt: account.suspendedAt,
        suspensionReason: account.suspensionReason,
        createdAt: account.createdAt,
        memberCount: users.length,
        activeUsersCount: users.filter((user) => user.status === UserStatus.ACTIVE).length,
        pendingUsersCount: users.filter((user) => user.status === UserStatus.PENDING).length,
        disabledUsersCount: users.filter((user) => user.status === UserStatus.DISABLED).length,
        lastLoginAt,
      };
    });
  }
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function uniqueUsers(users: User[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}
