import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { AssessmentsModule } from '../assessments/assessments.module';
import { ClassroomExpressionsModule } from '../classroom-expressions/classroom-expressions.module';
import { LessonContentsModule } from '../lesson-contents/lesson-contents.module';
import { LessonKitsModule } from '../lesson-kits/lesson-kits.module';
import { StudentQuestionsModule } from '../student-questions/student-questions.module';
import { TeachingScriptsModule } from '../teaching-scripts/teaching-scripts.module';
import { VocabulariesModule } from '../vocabularies/vocabularies.module';
import { GenerationService } from './generation.service';
import { RegenerationPersistenceService } from './regeneration-persistence.service';
import { RegenerateService } from './regenerate.service';

@Module({
  imports: [
    LessonKitsModule,
    LessonContentsModule,
    VocabulariesModule,
    ClassroomExpressionsModule,
    ActivitiesModule,
    TeachingScriptsModule,
    StudentQuestionsModule,
    AssessmentsModule,
  ],
  providers: [
    GenerationService,
    RegenerateService,
    RegenerationPersistenceService,
  ],
  exports: [GenerationService, RegenerateService],
})
export class GenerationModule {}
