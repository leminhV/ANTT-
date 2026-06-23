import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('import')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async importUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file Excel');
    }
    return this.usersService.importFromExcel(file.buffer);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Get(':id/activity')
  @Roles(Role.ADMIN)
  getActivity(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserActivity(id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: UserPayload,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, updateProfileDto);
  }

  @Get('me/login-history')
  getLoginHistory(@CurrentUser() user: UserPayload) {
    return this.usersService.getLoginHistory(user.userId);
  }

  @Patch(':id/reset-mfa')
  @Roles(Role.ADMIN)
  resetMfa(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.disableMfa(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Patch(':id/trust-score')
  @Roles(Role.ADMIN)
  updateTrustScore(
    @Param('id', ParseIntPipe) id: number,
    @Body('scoreDiff') scoreDiff: number,
  ) {
    if (scoreDiff === undefined || isNaN(scoreDiff)) {
      throw new BadRequestException(
        'Vui lòng cung cấp điểm cần thay đổi (scoreDiff)',
      );
    }
    return this.usersService.updateTrustScore(id, Number(scoreDiff));
  }
}
