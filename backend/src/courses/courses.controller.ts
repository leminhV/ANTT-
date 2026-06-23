import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
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
    @Body()
    createData: {
      code: string;
      name: string;
      instructor_id: number;
      semester?: string;
      academic_year?: string;
    },
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
    updateData: {
      code?: string;
      name?: string;
      instructor_id?: number;
      semester?: string;
      academic_year?: string;
    },
    @Req() req: any,
  ) {
    return this.coursesService.update(+id, updateData, req.user);
  }

  @Post(':id/request-delete')
  @UseGuards(ThrottlerGuard)
  @Roles(Role.INSTRUCTOR)
  requestDelete(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    return this.coursesService.requestDelete(+id, req.user, body.reason);
  }

  @Delete(':id')
  @UseGuards(ThrottlerGuard) // Bổ sung Rate Limit chống tool gọi xóa liên tục
  @Roles(Role.ADMIN) // Chỉ Admin mới được quyền xóa khóa học
  remove(@Param('id') id: string) {
    return this.coursesService.remove(+id);
  }
}
