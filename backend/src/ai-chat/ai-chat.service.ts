import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AiChatContext } from './ai-chat.controller';

@Injectable()
export class AiChatService {
  private ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async chat(
    message: string,
    role: string,
    context: AiChatContext,
  ): Promise<{ reply: string; action?: string | null; payload?: unknown }> {
    if (!this.ai) {
      return {
        reply:
          'Hệ thống chưa được cấu hình GEMINI_API_KEY trong file .env. Vui lòng liên hệ Admin để thêm API Key nhé!',
        action: null,
      };
    }

    const systemInstruction = `
Bạn là Trợ lý ảo AI của hệ thống LabBook (Quản lý Phòng Lab).
Người dùng đang chat với bạn có vai trò (role) là: ${role}.
Ngữ cảnh (Context) hệ thống lúc này:
Thiết bị: ${JSON.stringify(context?.equipment?.map((e: { id: number; name: string; status: string }) => ({ id: e.id, name: e.name, status: e.status })) || [])}
Booking gần đây: ${JSON.stringify(context?.bookings?.slice(0, 5) || [])}

Nhiệm vụ của bạn là đọc yêu cầu của người dùng, suy nghĩ dựa trên Ngữ cảnh, và trả lời thật tự nhiên, thân thiện.

[HỖ TRỢ THỰC THI LỆNH]
Nếu người dùng yêu cầu hành động, bạn có thể ra lệnh cho Frontend thực thi bằng cách trả về trường "action":
- Nếu yêu cầu duyệt tất cả đơn (CHỈ CHO PHÉP NẾU ROLE=ADMIN): "action": "approve-all"
- Nếu yêu cầu hủy đơn số X: "action": "cancel-booking", "payload": { "id": X }

PHẢI TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON (Không bọc bằng dấu \`\`\`json):
{
  "reply": "Câu trả lời giao tiếp tự nhiên của bạn",
  "action": "approve-all" | "cancel-booking" | null,
  "payload": { "id": 123 } // hoặc null
}
`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text;
      if (!text) return { reply: 'Xin lỗi, tôi không thể phản hồi lúc này.' };

      const parsed = JSON.parse(text) as {
        reply: string;
        action?: string | null;
        payload?: unknown;
      };
      return parsed;
    } catch (error) {
      console.error('Gemini API Error:', (error as Error).message);
      return {
        reply:
          'Xin lỗi, não bộ AI của tôi đang gặp chút sự cố kết nối. Hãy thử lại sau nhé!',
      };
    }
  }
}
