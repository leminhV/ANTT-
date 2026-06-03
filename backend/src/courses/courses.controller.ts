import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '@prisma/client';
import { ThrottlerGuard } from '@nestjs/throttler';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseGuards(ThrottlerGuard) // Bổ sung Rate Limit riêng tránh spam tạo khóa học
  @Roles(Role.ADMIN, Role.INSTRUCTOR) // Chỉ Admin hoặc Giảng viên mới được tạo
  create(
    @Body() createData: { code: string; name: string; instructor_id: number },
  ) {
    return this.coursesService.create(createData);
  }

  @Public() // Bypass JWT Guard để lấy danh sách public
  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  update(
    @Param('id') id: string,
    @Body()
    updateData: { code?: string; name?: string; instructor_id?: number },
  ) {
    return this.coursesService.update(+id, updateData);
  }

  @Delete(':id')
  @UseGuards(ThrottlerGuard) // Bổ sung Rate Limit chống tool gọi xóa liên tục
  @Roles(Role.ADMIN) // Chỉ quyền lực cao nhất (ADMIN) mới được xóa khóa học
  remove(@Param('id') id: string) {
    return this.coursesService.remove(+id);
  }
}
