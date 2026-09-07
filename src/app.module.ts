import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LessonConfigModule } from './config/config.module';
import { LessonContentsModule } from './modules/lesson-contents/lesson-contents.module';
import { LessonKitsModule } from './modules/lesson-kits/lesson-kits.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/lesson-kit-generator'),

    EventEmitterModule.forRoot(),

    LessonConfigModule,
    LessonContentsModule,
    LessonKitsModule,

    // TODO: Dev B modules
    // VocabulariesModule,
    // ClassroomExpressionsModule,
    // ActivitiesModule,

    // TODO: Dev C modules
    // TeachingScriptsModule,
    // StudentQuestionsModule,
    // AssessmentsModule,
    // GenerationModule,
  ],
})
export class AppModule { }
