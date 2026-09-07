import { Controller, Get, Query } from '@nestjs/common';
import { LessonContentsService } from './lesson-contents.service';
import { BaseResponseDto } from '../../common/dto';

@Controller('api/lessons')
export class LessonContentsController {
  constructor(
    private readonly lessonContentsService: LessonContentsService,
  ) {}

  /**
   * GET /api/lessons?subject=VAT_LI&grade=10
   * Danh sách bài học theo môn + lớp
   */
  @Get()
  async findAll(
    @Query('subject') subject: string,
    @Query('grade') grade: string,
  ) {
    const data = await this.lessonContentsService.findBySubjectAndGrade(
      subject,
      grade,
    );
    return BaseResponseDto.ok(data, 'Danh sách bài học');
  }
}
