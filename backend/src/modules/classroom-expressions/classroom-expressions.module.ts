import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ClassroomExpression,
  ClassroomExpressionSchema,
} from './schemas/classroom-expression.schema';
import { ClassroomExpressionsService } from './classroom-expressions.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClassroomExpression.name, schema: ClassroomExpressionSchema },
    ]),
    AiModule,
  ],
  providers: [ClassroomExpressionsService],
  exports: [ClassroomExpressionsService],
})
export class ClassroomExpressionsModule {}
