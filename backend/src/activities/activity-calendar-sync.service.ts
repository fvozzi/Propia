import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleCalendarService } from '../calendar/google-calendar.service';
import { Activity } from './activity.entity';
import { isSchedulableActivityType } from './schedulable-activity-types';

@Injectable()
export class ActivityCalendarSyncService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async syncById(activityId: number, mode: 'create' | 'update' = 'update') {
    const activity = await this.findForSync(activityId);

    if (!activity) {
      return null;
    }

    if (!isSchedulableActivityType(activity.activityType)) {
      if (activity.googleEventId) {
        await this.deleteExternal(activity);
      }

      activity.googleEventId = null;
      activity.googleSyncStatus = 'SKIPPED';
      activity.googleSyncError = null;
      activity.lastSyncedAt = null;
      await this.activitiesRepository.save(activity);
      return activity;
    }

    try {
      const result =
        mode === 'create'
          ? await this.googleCalendarService.syncActivityCreate(activity.ownerUserId, activity)
          : await this.googleCalendarService.syncActivityUpdate(activity.ownerUserId, activity);

      Object.assign(activity, result);
    } catch (error) {
      activity.googleSyncStatus = 'ERROR';
      activity.googleSyncError = error instanceof Error ? error.message : 'Unknown sync error';
    }

    await this.activitiesRepository.save(activity);
    return activity;
  }

  async syncMany(activityIds: number[]) {
    for (const activityId of activityIds) {
      await this.syncById(activityId, 'update');
    }
  }

  async deleteExternal(activity: Activity) {
    try {
      await this.googleCalendarService.syncActivityDelete(activity.ownerUserId, activity);
    } catch {
      // Preserve local delete even if Google Calendar fails.
    }
  }

  private findForSync(activityId: number) {
    return this.activitiesRepository.findOne({
      where: { id: activityId },
      relations: {
        contact: true,
        property: true,
        appraisalRequest: true,
      },
    });
  }
}
