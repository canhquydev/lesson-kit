import { Module } from '@nestjs/common';
import { LessonConfigController } from './config.controller';
import { LessonConfigService } from './config.service';
import { LessonContentsModule } from '../modules/lesson-contents/lesson-contents.module';

@Module({
  imports: [LessonContentsModule],
  controllers: [LessonConfigController],
  providers: [LessonConfigService],
})
export class LessonConfigModule {}
