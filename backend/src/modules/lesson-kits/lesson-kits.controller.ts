import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
  Sse,
  MessageEvent,
  Header,
  ParseEnumPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { Observable, fromEvent, interval, merge, defer } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LessonKitsService } from './lesson-kits.service';
import { CreateLessonKitDto } from './dto';
import { BaseResponseDto } from '../../common/dto';
import { ParseMongoIdPipe } from '../../common/pipes';
import { RegenerateService } from '../generation/regenerate.service';
import { ComponentType } from '../../common/enums';

const MAX_PAGINATION_LIMIT = 100;
const HEARTBEAT_INTERVAL_MS = 15000;

@Controller('api/lesson-kit')
export class LessonKitsController {
  constructor(
    private readonly lessonKitsService: LessonKitsService,
    @Inject(forwardRef(() => RegenerateService))
    private readonly regenerateService: RegenerateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(@Body() dto: CreateLessonKitDto) {
    const kit = await this.lessonKitsService.create(dto);
    return BaseResponseDto.ok(
      { lesson_kit_id: kit._id, status: kit.status },
      'Lesson Kit đang được tạo',
    );
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), MAX_PAGINATION_LIMIT);
    const data = await this.lessonKitsService.findAll(safePage, safeLimit);
    return BaseResponseDto.ok(data, 'Danh sách Lesson Kit');
  }

  @Get(':id')
  async findOne(@Param('id', ParseMongoIdPipe) id: string) {
    const data = await this.lessonKitsService.findById(id);
    return BaseResponseDto.ok(data, 'Chi tiết Lesson Kit');
  }

  @Get(':id/status')
  async getStatus(@Param('id', ParseMongoIdPipe) id: string) {
    const data = await this.lessonKitsService.getStatus(id);
    return BaseResponseDto.ok(data, 'Trạng thái Lesson Kit');
  }

  @Sse(':id/progress-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  progressStream(
    @Param('id', ParseMongoIdPipe) id: string,
  ): Observable<MessageEvent> {
    const initial$ = defer(async () => {
      const current = await this.lessonKitsService.getStatus(id);
      return { data: current };
    });

    const event$ = fromEvent(this.eventEmitter, `kit.${id}.progress`).pipe(
      map((payload) => ({ data: payload }) as MessageEvent),
    );

    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({ data: { type: 'heartbeat' } })),
    );

    return merge(initial$, event$, heartbeat$);
  }

  @Delete(':id')
  async delete(@Param('id', ParseMongoIdPipe) id: string) {
    await this.lessonKitsService.delete(id);
    return BaseResponseDto.ok({ id }, 'Đã xóa Lesson Kit');
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  async retry(@Param('id', ParseMongoIdPipe) id: string) {
    const data = await this.lessonKitsService.retry(id);
    return BaseResponseDto.ok(data, 'Lesson Kit đang được tiếp tục tạo');
  }

  @Post(':id/regenerate-all-stale')
  async regenerateAllStale(@Param('id', ParseMongoIdPipe) id: string) {
    const result = await this.regenerateService.regenerateAllStale(id);
    return BaseResponseDto.ok(result, 'Đã cập nhật toàn bộ phần cần thiết');
  }

  @Post(':id/regenerate/:component')
  async regenerate(
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('component', new ParseEnumPipe(ComponentType))
    component: ComponentType,
  ) {
    const result = await this.regenerateService.regenerate(id, component);
    return BaseResponseDto.ok(result, `Đã tạo lại ${component}`);
  }
}
