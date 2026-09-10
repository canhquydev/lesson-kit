import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Activity, ActivitySchema } from './schemas/activity.schema';
import { ActivitiesService } from './activities.service';
import { AiModule } from '../ai/ai.module';

/**
 * Module quản lý Hoạt động tương tác trên lớp (Activities - Phase 1)
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Activity.name, schema: ActivitySchema },
    ]),
    AiModule,
  ],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
