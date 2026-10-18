import { TCG_SYSTEM_PROMPT } from './prompt.ts';
import { tools, executeTool } from './tools.ts';

export interface MediaAttachment {
  mimeType: string;
  data: string; // base64
}

export interface ChatPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  functionCall?: any;
  functionResponse?: any;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatPart[];
}

export class TCGEngine {
  private history: Map<string, ChatMessage[]> = new Map();
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    this.model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  }

  async processMessage(
    chatId: string,
    sender: string,
    incomingText: string,
    media?: MediaAttachment
  ): Promise<string> {
    let chatHistory = this.history.get(chatId);
    if (!chatHistory) {
      chatHistory = [];
      this.history.set(chatId, chatHistory);
    }

    const parts: ChatPart[] = [];
    const userMessageContent = `[Sender: ${sender}]\n${incomingText}`;
    parts.push({ text: userMessageContent });

    if (media) {
      parts.push({
        inlineData: {
          mimeType: media.mimeType,
          data: media.data,
        },
      });
    }

    chatHistory.push({
      role: 'user',
      parts,
    });

    if (chatHistory.length > 20) {
      chatHistory.splice(0, chatHistory.length - 20);
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: TCG_SYSTEM_PROMPT }],
      },
      contents: chatHistory,
      tools: [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ],
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error('Gemini API Error:', data);
        return "Line dropped for a sec. Run that by me one more time?";
      }

      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Check for function calls
      const functionCallPart = parts.find((p: any) => p.functionCall);
      if (functionCallPart) {
        const { name, args } = functionCallPart.functionCall;
        console.log(`⚡ [TCG TOOL]: ${name}`, args);

        const toolResult = await executeTool(name, args || {});

        // Send tool output back to model for final reply
        const followUpPayload = {
          systemInstruction: {
            parts: [{ text: TCG_SYSTEM_PROMPT }],
          },
          contents: [
            ...chatHistory,
            {
              role: 'model',
              parts: [{ functionCall: { name, args } }],
            },
            {
              role: 'user',
              parts: [
                {
                  text: `Tool '${name}' returned:\n${JSON.stringify(toolResult)}\nNow reply conversationally to the user in iMessage format.`,
                },
              ],
            },
          ],
        };

        const followUpRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(followUpPayload),
        });

        const followUpData = await followUpRes.json();
        const finalCandidate = followUpData.candidates?.[0];
        let finalReply = finalCandidate?.content?.parts?.[0]?.text || "Locked in. That's the move.";
        finalReply = finalReply.replace(/^\[Sender:\s*[^\]]+\]\s*/i, '').trim();
        chatHistory.push({ role: 'model', parts: [{ text: finalReply }] });
        return finalReply;
      }

      let textReply = parts[0]?.text || "Talk to me. What's the plan?";
      textReply = textReply.replace(/^\[Sender:\s*[^\]]+\]\s*/i, '').trim();
      chatHistory.push({ role: 'model', parts: [{ text: textReply }] });
      return textReply;
    } catch (err: any) {
      console.error('TCG Engine Execution Error:', err);
      return "Signal hit a bump. What did you say?";
    }
  }
}
