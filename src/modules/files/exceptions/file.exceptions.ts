import { HttpException, HttpStatus } from '@nestjs/common';

export class FileNotFoundException extends HttpException {
  constructor(fileId: string) {
    super(
      {
        status: HttpStatus.NOT_FOUND,
        error: 'File not found',
        fileId,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class FileUploadException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'File upload failed',
        message,
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidFileTypeException extends HttpException {
  constructor(mimetype: string, allowedTypes: string[]) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'Invalid file type',
        mimetype,
        allowedTypes,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
