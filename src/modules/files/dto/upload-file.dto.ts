import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StorageProvider } from '../enums/storage-provider.enum';

export class ImageOptionsDto {
  @ApiPropertyOptional({ type: Number, description: 'Width in pixels' })
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ type: Number, description: 'Height in pixels' })
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ type: Number, description: 'Quality (1-100)' })
  @IsOptional()
  quality?: number;

  @ApiPropertyOptional({ enum: ['jpeg', 'png', 'webp'], description: 'Output format' })
  @IsOptional()
  format?: 'jpeg' | 'png' | 'webp';
}

export class UploadFileDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'File to upload' })
  file: Express.Multer.File;

  @ApiPropertyOptional({
    enum: StorageProvider,
    description: 'Storage provider to use',
  })
  @IsEnum(StorageProvider)
  @IsOptional()
  provider?: StorageProvider;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether to process image files',
  })
  @IsBoolean()
  @IsOptional()
  processImage?: boolean;

  @ApiPropertyOptional({
    type: ImageOptionsDto,
    description: 'Image processing options',
  })
  @ValidateNested()
  @Type(() => ImageOptionsDto)
  @IsOptional()
  imageOptions?: ImageOptionsDto;
}
