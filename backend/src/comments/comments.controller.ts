import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsAuthorGuard } from './guards/is-author.guard';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @CurrentUser() user: UserPayload,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.commentsService.create(user.userId, createCommentDto);
  }

  @Get()
  findAll(
    @Query('reportId') reportId?: string,
    @Query('bookingId') bookingId?: string,
    @Query('equipmentId') equipmentId?: string,
  ) {
    return this.commentsService.findAllByEntity(
      reportId ? parseInt(reportId) : undefined,
      bookingId ? parseInt(bookingId) : undefined,
      equipmentId ? parseInt(equipmentId) : undefined,
    );
  }

  @Delete(':id')
  @UseGuards(IsAuthorGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    // We don't need to pass user anymore because IsAuthorGuard already handles the authorization.
    // However, I still need to fix the service to not take currentUser.
    return this.commentsService.remove(id);
  }
}
