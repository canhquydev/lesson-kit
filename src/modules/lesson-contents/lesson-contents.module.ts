import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LessonContent,
  LessonContentSchema,
} from './schemas/lesson-content.schema';
import { LessonContentsService } from './lesson-contents.service';
import { LessonContentsController } from './lesson-contents.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LessonContent.name, schema: LessonContentSchema },
    ]),
  ],
  controllers: [LessonContentsController],
  providers: [LessonContentsService],
  exports: [LessonContentsService],
})
export class LessonContentsModule {}
