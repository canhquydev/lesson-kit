import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || !/^[0-9a-fA-F]{24}$/.test(String(value))) {
      throw new BadRequestException(
        'Validation failed (Mongo ID is expected)',
      );
    }
    return value;
  }
}
