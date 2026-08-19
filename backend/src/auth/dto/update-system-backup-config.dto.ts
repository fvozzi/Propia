import { IsBoolean, IsInt, Max, Min } from 'class-validator';

export class UpdateSystemBackupConfigDto {
  @IsBoolean()
  backupsEnabled: boolean;

  @IsInt()
  @Min(1)
  @Max(365)
  retentionCount: number;

  @IsInt()
  @Min(0)
  @Max(23)
  scheduleHourUtc: number;

  @IsInt()
  @Min(0)
  @Max(59)
  scheduleMinuteUtc: number;
}
