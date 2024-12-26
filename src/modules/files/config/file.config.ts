import { registerAs } from '@nestjs/config';

export default registerAs('file', () => ({
  local: {
    uploadDir: process.env.LOCAL_UPLOAD_DIR ?? 'uploads',
    baseUrl: process.env.LOCAL_FILES_BASE_URL ?? 'http://localhost:3000/files',
  },
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '5242880', 10), // 5MB
  chunkSize: parseInt(process.env.UPLOAD_CHUNK_SIZE ?? '1048576', 10), // 1MB
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES ?? 'image/*,application/pdf').split(','),
  rateLimit: {
    points: parseInt(process.env.UPLOAD_RATE_LIMIT_POINTS ?? '10', 10),
    duration: parseInt(process.env.UPLOAD_RATE_LIMIT_DURATION ?? '3600', 10),
    blockDuration: parseInt(process.env.UPLOAD_RATE_LIMIT_BLOCK_DURATION ?? '3600', 10),
  },
  imageProcessing: {
    maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH ?? '2000', 10),
    maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT ?? '2000', 10),
    defaultQuality: parseInt(process.env.IMAGE_DEFAULT_QUALITY ?? '80', 10),
  },
  security: {
    scanVirus: process.env.SCAN_VIRUS === 'true',
    clamavHost: process.env.CLAMAV_HOST ?? 'localhost',
    clamavPort: parseInt(process.env.CLAMAV_PORT ?? '3310', 10),
  },
}));
