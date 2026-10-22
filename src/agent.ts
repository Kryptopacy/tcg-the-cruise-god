import { buildSystemPrompt } from './prompt.ts';
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
  functionCall?: {
    name: string;
    args: Record<string, any>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, any>;
  };
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

  private cleanReply(text: string): string {
    return text
      .replace(/^\[Sender:\s*[^\]]+\]\s*/i, '')
      .replace(/^TCG:\s*/i, '')
      .trim();
  }

  private async callGeminiWithRetry(endpoint: string, payload: any, maxRetries: number = 2): Promise<any> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(60000),
        });

        const data = await res.json();
        if (res.ok) return data;

        // If 503 or 429, wait briefly and retry
        if ((res.status === 503 || res.status === 429) && attempt < maxRetries) {
          console.warn(`Gemini API returned ${res.status}, retrying in ${(attempt + 1) * 1500}ms...`);
          await new Promise((r) => setTimeout(r, (attempt + 1) * 1500));
          continue;
        }

        console.error('Gemini API Error:', data);
        return null;
      } catch (e: any) {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
          continue;
        }
        console.error('Gemini network exception:', e);
        return null;
      }
    }
    return null;
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

    const isGroup = chatId.includes('-group-') || chatId.startsWith('group:') || sender !== 'Direct';
    const systemPrompt = buildSystemPrompt({
      chatType: isGroup ? 'group' : 'direct',
    });

    const userParts: ChatPart[] = [];
    const formattedText = `[Sender: ${sender}]\n${incomingText}`;
    userParts.push({ text: formattedText });

    if (media) {
      userParts.push({
        inlineData: {
          mimeType: media.mimeType,
          data: media.data,
        },
      });
    }

    const pendingUserMessage: ChatMessage = {
      role: 'user',
      parts: userParts,
    };

    const currentHistory = [...chatHistory, pendingUserMessage];

    // Keep history manageable
    if (currentHistory.length > 20) {
      currentHistory.splice(0, currentHistory.length - 20);
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: currentHistory,
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

    const data = await this.callGeminiWithRetry(endpoint, payload);
    if (!data) {
      return "Line dropped for a second. Run that by me one more time?";
    }

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Check for function calls
    const functionCallPart = parts.find((p: any) => p.functionCall);
    if (functionCallPart && functionCallPart.functionCall) {
      const { name, args } = functionCallPart.functionCall;
      console.log(`⚡ [TCG TOOL]: ${name}`, args);

      const toolResult = await executeTool(name, args || {});

      // Standard Gemini Function Response Turn
      // CRITICAL: Preserve candidate.content.parts verbatim so thought_signature
      // and internal metadata required by Gemini 2.5/3.x are retained!
      const followUpPayload = {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          ...currentHistory,
          {
            role: 'model',
            parts: candidate.content.parts,
          },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name,
                  response: { result: toolResult },
                },
              },
            ],
          },
        ],
      };

      const followUpData = await this.callGeminiWithRetry(endpoint, followUpPayload);
      if (followUpData) {
        const finalCandidate = followUpData.candidates?.[0];
        const finalParts = finalCandidate?.content?.parts || [];

        // Check if model chained a second tool call (e.g. spinTheBottle -> getTruthOrDare)
        const secondToolCall = finalParts.find((p: any) => p.functionCall);
        if (secondToolCall && secondToolCall.functionCall) {
          const secondName = secondToolCall.functionCall.name;
          const secondArgs = secondToolCall.functionCall.args || {};
          console.log(`⚡ [TCG CHAINED TOOL]: ${secondName}`, secondArgs);
          const secondResult = await executeTool(secondName, secondArgs);

          const chainedPayload = {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              ...followUpPayload.contents,
              { role: 'model', parts: finalCandidate.content.parts },
              {
                role: 'user',
                parts: [{ functionResponse: { name: secondName, response: { result: secondResult } } }],
              },
            ],
          };

          const chainedData = await this.callGeminiWithRetry(endpoint, chainedPayload);
          if (chainedData) {
            const chainedCandidate = chainedData.candidates?.[0];
            const chainedTextPart = chainedCandidate?.content?.parts?.find((p: any) => p.text && !p.thought)
              || chainedCandidate?.content?.parts?.find((p: any) => p.text);
            let chainedReply = chainedTextPart?.text || "Locked in. That's the move.";
            chainedReply = this.cleanReply(chainedReply);
            chatHistory.push(pendingUserMessage);
            chatHistory.push({ role: 'model', parts: [{ text: chainedReply }] });
            return chainedReply;
          }
        }

        const textPart = finalParts.find((p: any) => p.text && !p.thought) || finalParts.find((p: any) => p.text);
        let finalReply = textPart?.text || "Locked in. That's the move.";
        finalReply = this.cleanReply(finalReply);

        // Commit successful exchange to history
        chatHistory.push(pendingUserMessage);
        chatHistory.push({
          role: 'model',
          parts: [{ text: finalReply }],
        });
        return finalReply;
      }
    }

    // Standard text response
    let textReply = parts[0]?.text || "Talk to me. What's the plan?";
    textReply = this.cleanReply(textReply);

    // Commit successful exchange to history
    chatHistory.push(pendingUserMessage);
    chatHistory.push({
      role: 'model',
      parts: [{ text: textReply }],
    });

    return textReply;
  }
}
