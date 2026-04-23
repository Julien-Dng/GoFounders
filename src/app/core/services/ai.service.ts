import { Injectable } from '@angular/core';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  // Calls Firebase Function which proxies to Anthropic API with user context injected
  async sendMessage(history: AiMessage[], userMessage: string): Promise<string> {
    return '';
  }
}
