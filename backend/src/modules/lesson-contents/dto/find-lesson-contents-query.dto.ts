import { IsNotEmpty, IsString } from 'class-validator';

export class FindLessonContentsQueryDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  grade: string;
}
