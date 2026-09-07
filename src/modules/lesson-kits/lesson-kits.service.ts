import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { LessonKit, LessonKitDocument } from './schemas/lesson-kit.schema';
import { CreateLessonKitDto } from './dto';
import { LessonKitStatus } from '../../common/enums';

@Injectable()
export class LessonKitsService {
  private readonly logger = new Logger(LessonKitsService.name);

  constructor(
    @InjectModel(LessonKit.name)
    private readonly lessonKitModel: Model<LessonKitDocument>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Tạo Lesson Kit mới → emit event để trigger pipeline
   */
  async create(dto: CreateLessonKitDto): Promise<LessonKitDocument> {
    const lessonKit = await this.lessonKitModel.create({
      ...dto,
      lesson_content_id: new Types.ObjectId(dto.lesson_content_id),
      status: LessonKitStatus.GENERATING,
      current_step: 'phase1',
      ai_model_version:
        this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o',
      request_id: new Types.ObjectId().toHexString(),
    });

    this.logger.log(`Created lesson kit: ${lessonKit._id}`);

    // Emit event — Dev C sẽ listen event này để trigger pipeline
    this.eventEmitter.emit('lesson-kit.generate', {
      lessonKitId: lessonKit._id.toHexString(),
    });

    return lessonKit;
  }

  /**
   * Danh sách tất cả Lesson Kit
   */
  async findAll(): Promise<LessonKitDocument[]> {
    return this.lessonKitModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Chi tiết 1 Lesson Kit (không populate components — sẽ query riêng)
   */
  async findById(id: string): Promise<LessonKitDocument> {
    const kit = await this.lessonKitModel.findById(id).exec();
    if (!kit) {
      throw new NotFoundException(`Lesson Kit with ID "${id}" not found`);
    }
    return kit;
  }

  /**
   * Cập nhật status (Dev C pipeline gọi)
   */
  async updateStatus(
    id: string,
    status: LessonKitStatus,
    generationTimeMs?: number,
  ): Promise<void> {
    const updateData: any = { status };
    if (generationTimeMs !== undefined) {
      updateData.generation_time_ms = generationTimeMs;
    }
    await this.lessonKitModel.findByIdAndUpdate(id, updateData).exec();
    this.logger.log(`Kit ${id} status → ${status}`);
  }

  /**
   * Cập nhật current_step (Dev C pipeline gọi)
   */
  async updateCurrentStep(id: string, step: string): Promise<void> {
    await this.lessonKitModel
      .findByIdAndUpdate(id, { current_step: step })
      .exec();
    this.logger.log(`Kit ${id} step → ${step}`);
  }

  /**
   * Lấy trạng thái sinh (FE polling)
   */
  async getStatus(id: string) {
    const kit = await this.findById(id);
    return {
      status: kit.status,
      current_step: kit.current_step,
      generation_time_ms: kit.generation_time_ms,
    };
  }

  /**
   * Xóa Lesson Kit + cascade xóa 6 component collections
   */
  async delete(id: string): Promise<void> {
    const kit = await this.findById(id);

    // Cascade delete all components by lesson_kit_id
    const componentCollections = [
      'vocabularies',
      'classroom_expressions',
      'activities',
      'teaching_scripts',
      'student_questions',
      'assessments',
    ];

    const db = this.lessonKitModel.db;
    const kitObjectId = kit._id;

    await Promise.all(
      componentCollections.map((collection) =>
        db.collection(collection).deleteMany({ lesson_kit_id: kitObjectId }),
      ),
    );

    await this.lessonKitModel.findByIdAndDelete(id).exec();
    this.logger.log(`Deleted kit ${id} and all components`);
  }
}
