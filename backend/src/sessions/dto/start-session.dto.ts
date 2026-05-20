import { ApiProperty } from '@nestjs/swagger';

export class StartSessionDto {
  @ApiProperty({ example: 'youtube.com' })
  domain!: string;

  @ApiProperty({ example: 'youtube.com' })
  name!: string;

  @ApiProperty({ example: 'https://www.youtube.com/' })
  pageUrl!: string;

  @ApiProperty({ example: 'YouTube' })
  pageTitle!: string;

  @ApiProperty({ example: 'Distraction' })
  category!: string;

  @ApiProperty({ example: 'known_site' })
  classificationSource!: string;
}