import { IsInt, Min } from 'class-validator';

export class SwitchActiveTeamDto {
  @IsInt()
  @Min(1)
  teamId: number;
}
