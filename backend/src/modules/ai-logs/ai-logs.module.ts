import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AiErrorLog,
  AiErrorLogSchema,
} from './schemas/ai-error-log.schema';
import { AiLogsService } from './ai-logs.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AiErrorLog.name, schema: AiErrorLogSchema },
    ]),
  ],
  providers: [AiLogsService],
  exports: [AiLogsService],
})
export class AiLogsModule {}
