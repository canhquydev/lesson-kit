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
} from '@nestjs/common';
import { LessonKitsService } from './lesson-kits.service';
import { CreateLessonKitDto } from './dto';
import { BaseResponseDto } from '../../common/dto';
import { ParseMongoIdPipe } from '../../common/pipes';

@Controller('api/lesson-kit')
export class LessonKitsController {
  constructor(private readonly lessonKitsService: LessonKitsService) {}

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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const data = await this.lessonKitsService.findAll(pageNum, limitNum);
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

  @Delete(':id')
  async delete(@Param('id', ParseMongoIdPipe) id: string) {
    await this.lessonKitsService.delete(id);
    return BaseResponseDto.ok({ id }, 'Đã xóa Lesson Kit');
  }

  @Post(':id/regenerate/:component')
  async regenerate(
    @Param('id', ParseMongoIdPipe) id: string,
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
