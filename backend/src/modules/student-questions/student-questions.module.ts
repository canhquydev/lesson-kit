import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import {
  StudentQuestion,
  StudentQuestionSchema,
} from './schemas/student-question.schema';
import { StudentQuestionsService } from './student-questions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentQuestion.name, schema: StudentQuestionSchema },
    ]),
    AiModule,
  ],
  providers: [StudentQuestionsService],
  exports: [StudentQuestionsService],
})
export class StudentQuestionsModule {}
