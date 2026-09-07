import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LessonConfigController } from './config.controller';
import { LessonConfigService } from './config.service';
import {
  LessonContent,
  LessonContentSchema,
} from '../modules/lesson-contents/schemas/lesson-content.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LessonContent.name, schema: LessonContentSchema },
    ]),
  ],
  controllers: [LessonConfigController],
  providers: [LessonConfigService],
})
export class LessonConfigModule {}
