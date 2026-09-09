import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';

/**
 * Module quản lý kết nối và tương tác với dịch vụ AI dùng chung cho toàn bộ dự án
 */
@Module({
  imports: [ConfigModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
