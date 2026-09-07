import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LessonKitsService } from './lesson-kits.service';
import { CreateLessonKitDto } from './dto';
import { BaseResponseDto } from '../../common/dto';

@Controller('api/lesson-kit')
export class LessonKitsController {
  constructor(private readonly lessonKitsService: LessonKitsService) {}

  /**
   * POST /api/lesson-kit/generate
   * Tạo Lesson Kit mới → trigger pipeline
   */
  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(@Body() dto: CreateLessonKitDto) {
    const kit = await this.lessonKitsService.create(dto);
    return BaseResponseDto.ok(
      { lesson_kit_id: kit._id, status: kit.status },
      'Lesson Kit đang được tạo',
    );
  }

  /**
   * GET /api/lesson-kit
   * Danh sách tất cả Lesson Kit
   */
  @Get()
  async findAll() {
    const data = await this.lessonKitsService.findAll();
    return BaseResponseDto.ok(data, 'Danh sách Lesson Kit');
  }

  /**
   * GET /api/lesson-kit/:id
   * Chi tiết 1 Lesson Kit + 6 components
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.lessonKitsService.findById(id);
    return BaseResponseDto.ok(data, 'Chi tiết Lesson Kit');
  }

  /**
   * GET /api/lesson-kit/:id/status
   * Trạng thái sinh (FE polling mỗi 3-5s)
   */
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const data = await this.lessonKitsService.getStatus(id);
    return BaseResponseDto.ok(data, 'Trạng thái Lesson Kit');
  }

  /**
   * DELETE /api/lesson-kit/:id
   * Xóa Lesson Kit + cascade xóa components
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.lessonKitsService.delete(id);
    return BaseResponseDto.ok({ id }, 'Đã xóa Lesson Kit');
  }

  /**
   * POST /api/lesson-kit/:id/regenerate/:component
   * Tạo lại 1 component riêng lẻ
   * → Sẽ routing đến RegenerateService của Dev C
   */
  @Post(':id/regenerate/:component')
  async regenerate(
    @Param('id') id: string,
    @Param('component') component: string,
  ) {
    // TODO: Dev C sẽ implement RegenerateService
    // await this.regenerateService.regenerate(id, component);
    return BaseResponseDto.ok(
      { lesson_kit_id: id, component, status: 'regenerated' },
      `Đã tạo lại ${component}`,
    );
  }
}
