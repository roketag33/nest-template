import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InitChunkUploadDto {
  @ApiProperty()
  @IsString()
  filename: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  totalChunks: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalSize: number;
}

export class ChunkUploadDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  chunkNumber: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  totalChunks: number;

  @ApiProperty()
  @IsString()
  originalFileName: string;
}
