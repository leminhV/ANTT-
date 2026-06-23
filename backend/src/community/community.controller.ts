import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreatePostDto, CreateCommentDto } from './dto/community.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post('posts')
  createPost(@Req() req: Request, @Body() createPostDto: CreatePostDto) {
    const userId = (req.user as any).id;
    return this.communityService.createPost(userId, createPostDto);
  }

  @Get('posts')
  findAllPosts() {
    return this.communityService.findAllPosts();
  }

  @Get('posts/:id')
  findPostById(@Param('id', ParseIntPipe) id: number) {
    return this.communityService.findPostById(id);
  }

  @Post('posts/:id/comments')
  createComment(
    @Req() req: Request,
    @Param('id', ParseIntPipe) postId: number,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const userId = (req.user as any).id;
    return this.communityService.createComment(
      userId,
      postId,
      createCommentDto,
    );
  }
}
