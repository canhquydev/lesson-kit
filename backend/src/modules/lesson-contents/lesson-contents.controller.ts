import { Controller, Get, Query } from '@nestjs/common';
import { LessonContentsService } from './lesson-contents.service';
import { BaseResponseDto } from '../../common/dto';
import { FindLessonContentsQueryDto } from './dto';

@Controller('api/lessons')
export class LessonContentsController {
  constructor(private readonly lessonContentsService: LessonContentsService) {}

  @Get()
  async findAll(@Query() query: FindLessonContentsQueryDto) {
    const data = await this.lessonContentsService.findBySubjectAndGrade(
      query.subject,
      query.grade,
    );
    return BaseResponseDto.ok(data, 'Danh sách bài học');
  }
}
