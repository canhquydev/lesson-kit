import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import {
  TeachingScript,
  TeachingScriptSchema,
} from './schemas/teaching-script.schema';
import { TeachingScriptsService } from './teaching-scripts.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeachingScript.name, schema: TeachingScriptSchema },
    ]),
    AiModule,
  ],
  providers: [TeachingScriptsService],
  exports: [TeachingScriptsService],
})
export class TeachingScriptsModule {}
