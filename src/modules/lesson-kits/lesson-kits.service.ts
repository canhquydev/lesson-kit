import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { LessonKitStatus } from '../../common/enums';
import { LessonKit, LessonKitDocument } from './schemas/lesson-kit.schema';
import { CreateLessonKitDto, LessonKitDetailResponse } from './dto';

const LESSON_KIT_COMPONENTS = [
  { name: 'vocabularies', sortField: 'sort_order' },
  { name: 'classroom_expressions', sortField: 'sort_order' },
  { name: 'activities', sortField: 'sort_order' },
  { name: 'teaching_scripts', sortField: 'step_order' },
  { name: 'student_questions', sortField: 'sort_order' },
  { name: 'assessments', sortField: 'sort_order' },
];

@Injectable()
export class LessonKitsService {
  private readonly logger = new Logger(LessonKitsService.name);
  private readonly aiModelVersion: string;

  constructor(
    @InjectModel(LessonKit.name)
    private readonly lessonKitModel: Model<LessonKitDocument>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.aiModelVersion = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';
  }

  async create(dto: CreateLessonKitDto): Promise<LessonKitDocument> {
    const lessonKit = await this.lessonKitModel.create({
      ...dto,
      lesson_content_id: new Types.ObjectId(dto.lesson_content_id),
      status: LessonKitStatus.GENERATING,
      current_step: 'phase1',
      ai_model_version: this.aiModelVersion,
      request_id: new Types.ObjectId().toHexString(),
    });

    this.logger.log(`Created lesson kit: ${lessonKit._id}`);

    this.eventEmitter.emit('lesson-kit.generate', {
      lessonKitId: lessonKit._id.toHexString(),
    });

    return lessonKit;
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: LessonKitDocument[], total: number, page: number, limit: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.lessonKitModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.lessonKitModel.countDocuments().exec()
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<LessonKitDetailResponse> {
    const kit = await this.lessonKitModel.findById(id).lean().exec();
    if (!kit) {
      throw new NotFoundException(`Lesson Kit with ID "${id}" not found`);
    }

    const db = this.lessonKitModel.db;
    const kitObjectId = kit._id;

    const componentPromises = LESSON_KIT_COMPONENTS.map((comp) =>
      db
        .collection(comp.name)
        .find({ lesson_kit_id: kitObjectId })
        .sort({ [comp.sortField]: 1 })
        .toArray()
    );

    const [
      vocabularies,
      classroom_expressions,
      activities,
      teaching_scripts,
      student_questions,
      assessments,
    ] = await Promise.all(componentPromises);

    return {
      ...kit,
      vocabularies,
      classroom_expressions,
      activities,
      teaching_scripts,
      student_questions,
      assessments,
    };
  }

  async updateStatus(
    id: string,
    status: LessonKitStatus,
    generationTimeMs?: number,
  ): Promise<void> {
    const updateData: Partial<LessonKit> = { status };
    if (generationTimeMs !== undefined) {
      updateData.generation_time_ms = generationTimeMs;
    }
    const result = await this.lessonKitModel.findByIdAndUpdate(id, updateData).exec();
    if (!result) {
      throw new NotFoundException(`Lesson Kit with ID "${id}" not found`);
    }
    this.logger.log(`Kit ${id} status → ${status}`);
  }

  async updateCurrentStep(id: string, step: string): Promise<void> {
    const result = await this.lessonKitModel
      .findByIdAndUpdate(id, { current_step: step })
      .exec();
    if (!result) {
      throw new NotFoundException(`Lesson Kit with ID "${id}" not found`);
    }
    this.logger.log(`Kit ${id} step → ${step}`);
  }

  private calculateProgressPercent(status: LessonKitStatus, step?: string): number {
    if (status === LessonKitStatus.COMPLETED) {
      return 100;
    }
    if (status === LessonKitStatus.FAILED || status === LessonKitStatus.DRAFT) {
      return 0;
    }

    switch (step) {
      case 'phase1':
      case 'phase1_vocabulary':
      case 'phase1_expressions':
      case 'phase1_activities':
        return 30;
      case 'phase2':
      case 'phase2_script':
        return 65;
      case 'phase3':
      case 'phase3_questions':
      case 'phase3_assessment':
        return 90;
      case 'completed':
        return 100;
      default:
        return 10;
    }
  }

  async getStatus(id: string) {
    const kit = await this.lessonKitModel
      .findById(id, 'status current_step generation_time_ms')
      .exec();
    if (!kit) {
      throw new NotFoundException(`Lesson Kit with ID "${id}" not found`);
    }
    return {
      status: kit.status,
      current_step: kit.current_step,
      progress_percent: this.calculateProgressPercent(kit.status, kit.current_step),
      generation_time_ms: kit.generation_time_ms,
    };
  }

  async delete(id: string): Promise<void> {
    const kit = await this.lessonKitModel.findById(id).exec();
    if (!kit) {
      throw new NotFoundException(`Lesson Kit with ID "${id}" not found`);
    }

    const db = this.lessonKitModel.db;
    const kitObjectId = kit._id;

    const session = await db.startSession();
    try {
      await session.withTransaction(async () => {
        await Promise.all(
          LESSON_KIT_COMPONENTS.map((comp) =>
            db.collection(comp.name).deleteMany({ lesson_kit_id: kitObjectId }, { session }),
          ),
        );
        await this.lessonKitModel.findByIdAndDelete(id).session(session).exec();
      });
      this.logger.log(`Deleted kit ${id} and all components`);
    } finally {
      await session.endSession();
    }
  }
}
