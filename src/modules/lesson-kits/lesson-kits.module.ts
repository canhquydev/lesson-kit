import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LessonKit, LessonKitSchema } from './schemas/lesson-kit.schema';
import { LessonKitsService } from './lesson-kits.service';
import { LessonKitsController } from './lesson-kits.controller';
import { GenerationModule } from '../generation/generation.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LessonKit.name, schema: LessonKitSchema },
    ]),
    forwardRef(() => GenerationModule),
  ],
  controllers: [LessonKitsController],
  providers: [LessonKitsService],
  exports: [LessonKitsService],
})
export class LessonKitsModule {}

