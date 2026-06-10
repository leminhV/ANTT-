import { Controller, Post, Body } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';

export interface AiChatContext {
  bookings?: any[];
  equipment?: any[];
}

export class AiChatRequestDto {
  message: string;
  role: string;
  context: AiChatContext;
}

@Controller('chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post()
  async chat(@Body() body: AiChatRequestDto) {
    return this.aiChatService.chat(body.message, body.role, body.context);
  }
}
