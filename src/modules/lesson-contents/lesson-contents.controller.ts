import { Controller, Get, Query } from '@nestjs/common';
import { LessonContentsService } from './lesson-contents.service';
import { BaseResponseDto } from '../../common/dto';

@Controller('api/lessons')
export class LessonContentsController {
  constructor(
    private readonly lessonContentsService: LessonContentsService,
  ) { }


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
