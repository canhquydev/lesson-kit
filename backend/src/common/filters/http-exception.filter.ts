import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseResponseDto } from '../dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res = exceptionResponse as Record<string, unknown>;
        const rawMessage = res.message ?? exception.message;
        if (Array.isArray(rawMessage)) {
          message = rawMessage.join('; ');
        } else if (typeof rawMessage === 'string') {
          message = rawMessage;
        } else if (typeof rawMessage === 'object' && rawMessage !== null) {
          message = JSON.stringify(rawMessage);
        } else {
          message = String(rawMessage ?? '');
        }
        error = res.error;
      }
    }

    let logMessage = message;
    if (exception instanceof Error && !(exception instanceof HttpException)) {
      logMessage = exception.message;
    } else if (typeof exception === 'string') {
      logMessage = exception;
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      !(exception instanceof HttpException)
    ) {
      try {
        logMessage = JSON.stringify(exception);
      } catch {
        logMessage = '[Unserializable Object]';
      }
    }
    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${logMessage}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response
      .status(status)
      .json(
        BaseResponseDto.fail(
          message,
          error as string | Record<string, unknown>,
        ),
      );
  }
}
