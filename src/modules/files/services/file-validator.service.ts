// src/modules/files/services/file-validator.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mime from 'mime-types';
import * as Magic from 'mmmagic';
import * as ClamAV from 'clamav.js';
import { Readable } from 'stream';
import { promisify } from 'util';

@Injectable()
export class FileValidatorService {
  private readonly logger = new Logger(FileValidatorService.name);
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];
  private clamAVScanner: ClamAV.ClamAVScanner | null = null;
  private readonly magic: Magic.Magic;

  constructor(private readonly configService: ConfigService) {
    this.maxFileSize = this.configService.get<number>('file.maxFileSize', 5 * 1024 * 1024);
    this.allowedMimeTypes = this.configService.get<string[]>('file.allowedMimeTypes', [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
    ]);

    this.magic = new Magic.Magic(Magic.MAGIC_MIME_TYPE);
    this.initClamAV().catch(error => {
      this.logger.warn('ClamAV initialization failed:', error);
    });
  }

  private async initClamAV(): Promise<void> {
    try {
      this.clamAVScanner = await ClamAV.createScanner({
        removeInfected: true,
        quarantineInfected: true,
        scanLog: null,
        debugMode: false,
        fileList: null,
        scanTimeout: 60000,
      });
    } catch (error) {
      this.logger.warn('ClamAV initialization failed. Virus scanning will be disabled.');
      this.logger.warn('Error:', error);
      this.clamAVScanner = null;
    }
  }

  async validateFile(file: Express.Multer.File): Promise<void> {
    // Vérification de la taille
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
      );
    }

    // Vérification du type MIME
    const detectFile = promisify(this.magic.detect).bind(this.magic);
    const detectedMime = await detectFile(file.buffer);
    const declaredMime = mime.lookup(file.originalname);

    // Convertir detectedMime en string s'il est un tableau
    const mimeType = Array.isArray(detectedMime) ? detectedMime[0] : detectedMime;

    if (!mimeType || typeof mimeType !== 'string') {
      throw new BadRequestException('Could not determine file type');
    }

    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException('File type not allowed');
    }

    if (!declaredMime || declaredMime !== mimeType) {
      throw new BadRequestException('File extension does not match its content');
    }

    // Scan antivirus
    if (this.clamAVScanner) {
      const isInfected = await this.scanForVirus(file.buffer);
      if (isInfected) {
        throw new BadRequestException('File is infected with malware');
      }
    }
  }
  private async scanForVirus(buffer: Buffer): Promise<boolean> {
    if (!this.clamAVScanner) return false;

    try {
      const stream = Readable.from(buffer);
      const result = await this.clamAVScanner.scanStream(stream);
      return result.isInfected;
    } catch (error) {
      this.logger.error('Virus scan failed:', error);
      throw new BadRequestException('File scanning failed');
    }
  }

  public async reinitializeClamAV(): Promise<void> {
    await this.initClamAV();
  }

  public isClamAVEnabled(): boolean {
    return this.clamAVScanner !== null;
  }
}
