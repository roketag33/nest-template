import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { FileEventsService, FileEventType } from '../services/file-events.service';

@Catch()
export class FileExceptionFilter implements ExceptionFilter {
  constructor(private readonly fileEvents: FileEventsService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || message;
      details = (exceptionResponse as any).details;
    }

    // Émettre un événement en cas d'erreur
    this.fileEvents.emitEvent({
      type: FileEventType.UPLOAD_FAILED,
      error: {
        message,
        details,
        path: request.path,
      },
    });

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      details,
    });
  }
}
