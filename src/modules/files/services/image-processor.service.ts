// src/modules/file/services/image-processor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  generateThumbnail?: boolean;
}

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions = {},
  ): Promise<{ processed: Buffer; thumbnail?: Buffer }> {
    try {
      let imageProcessor = sharp(buffer);

      // Redimensionnement si nécessaire
      if (options.width || options.height) {
        imageProcessor = imageProcessor.resize(options.width, options.height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Conversion de format si spécifié
      if (options.format) {
        imageProcessor = imageProcessor.toFormat(options.format, {
          quality: options.quality || 80,
        });
      }

      // Traiter l'image principale
      const processed = await imageProcessor.toBuffer();

      // Générer une miniature si demandé
      let thumbnail: Buffer | undefined;
      if (options.generateThumbnail) {
        thumbnail = await sharp(buffer)
          .resize(200, 200, { fit: 'cover' })
          .toFormat('jpeg', { quality: 70 })
          .toBuffer();
      }

      return { processed, thumbnail };
    } catch (error) {
      this.logger.error('Image processing failed:', error);
      throw error;
    }
  }

  async getMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    return sharp(buffer).metadata();
  }
}
