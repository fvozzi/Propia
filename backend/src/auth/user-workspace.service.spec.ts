import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { TeamMembershipRole } from '../common/enums';
import { UserWorkspaceService } from './user-workspace.service';

function createService() {
  const usersRepository = {
    save: vi.fn(async (user) => user),
    update: vi.fn(),
    findOne: vi.fn(),
  };
  const teamsRepository = {
    create: vi.fn((payload) => payload),
    save: vi.fn(async (team) => ({ id: 17, ...team })),
  };
  const membershipsRepository = {
    create: vi.fn((payload) => payload),
    save: vi.fn(async (membership) => membership),
    findOne: vi.fn(),
  };

  const service = new UserWorkspaceService(
    usersRepository as never,
    teamsRepository as never,
    membershipsRepository as never,
  );

  return {
    service,
    usersRepository,
    teamsRepository,
    membershipsRepository,
  };
}

describe('UserWorkspaceService', () => {
  it('creates a personal team when the user has no active team', async () => {
    const { service, usersRepository, teamsRepository, membershipsRepository } = createService();
    const user = { id: 5, name: 'Facundo Vozzi', email: 'facu@test.com', activeTeamId: null };

    const updatedUser = await service.ensurePersonalTeam(user as never);

    expect(teamsRepository.create).toHaveBeenCalledWith({ name: 'Facundo Vozzi Team' });
    expect(membershipsRepository.create).toHaveBeenCalledWith({
      teamId: 17,
      userId: 5,
      role: TeamMembershipRole.OWNER,
    });
    expect(usersRepository.save).toHaveBeenCalledWith({
      ...user,
      activeTeamId: 17,
    });
    expect(updatedUser.activeTeamId).toBe(17);
  });

  it('throws when trying to activate a team without membership', async () => {
    const { service, membershipsRepository } = createService();
    membershipsRepository.findOne.mockResolvedValue(null);

    await expect(service.setActiveTeam(5, 17)).rejects.toThrow(NotFoundException);
  });
});
