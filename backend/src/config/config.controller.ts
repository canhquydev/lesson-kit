import { Controller, Get } from '@nestjs/common';
import { LessonConfigService } from './config.service';
import { BaseResponseDto } from '../common/dto';

@Controller('api/config')
export class LessonConfigController {
  constructor(private readonly lessonConfigService: LessonConfigService) { }

  @Get('subjects')
  async getSubjects() {
    const data = await this.lessonConfigService.getSubjects();
    return BaseResponseDto.ok(data, 'Danh sách môn học');
  }

  @Get('options')
  getOptions() {
    const data = this.lessonConfigService.getOptions();
    return BaseResponseDto.ok(data, 'Cấu hình options');
  }
}
