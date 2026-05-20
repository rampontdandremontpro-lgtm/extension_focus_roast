import { ApiProperty } from '@nestjs/swagger';

export class EndSessionDto {
  @ApiProperty({ example: 1 })
  sessionId!: number;

  @ApiProperty({ example: 120 })
  durationSeconds!: number;
}