import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LessonKit, LessonKitSchema } from './schemas/lesson-kit.schema';
import { LessonKitsService } from './lesson-kits.service';
import { LessonKitsController } from './lesson-kits.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LessonKit.name, schema: LessonKitSchema },
    ]),
  ],
  controllers: [LessonKitsController],
  providers: [LessonKitsService],
  exports: [LessonKitsService],
})
export class LessonKitsModule {}
