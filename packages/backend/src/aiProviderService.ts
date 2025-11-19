import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIProviderService {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /**
   * Send a message to the configured AI provider and get a response
   */
  async chat(messages: AIMessage[]): Promise<string> {
    const { provider, apiKey, model } = this.config;

    try {
      switch (provider) {
        case 'openai':
          return await this.chatOpenAI(apiKey, messages, model || 'gpt-3.5-turbo');
        case 'anthropic':
          return await this.chatAnthropic(apiKey, messages, model || 'claude-3-sonnet-20240229');
        case 'gemini':
          return await this.chatGemini(apiKey, messages, model || 'gemini-pro');
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (error: any) {
      console.error(`Error in AI chat with ${provider}:`, error);
      throw new Error(`AI provider error: ${error.message}`);
    }
  }

  private async chatOpenAI(apiKey: string, messages: AIMessage[], model: string): Promise<string> {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      model,
    });
    return completion.choices[0]?.message?.content || 'No response from OpenAI.';
  }

  private async chatAnthropic(apiKey: string, messages: AIMessage[], model: string): Promise<string> {
    const anthropic = new Anthropic({ apiKey });
    
    // Anthropic doesn't support system messages in the same way
    // Extract system message if present and pass it separately
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: systemMessage?.content,
      messages: userMessages,
    });

    const firstBlock = response.content[0];
    if (firstBlock && 'text' in firstBlock) {
      return firstBlock.text;
    }
    return 'No response from Anthropic.';
  }

  private async chatGemini(apiKey: string, messages: AIMessage[], model: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });
    
    // Gemini uses a different message format - combine all messages into a prompt
    const prompt = messages.map(m => {
      const prefix = m.role === 'system' ? 'System: ' : m.role === 'user' ? 'User: ' : 'Assistant: ';
      return prefix + m.content;
    }).join('\n\n');

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Analyze Kubernetes cluster data with AI
   */
  async analyzeClusterData(clusterData: any, question?: string): Promise<string> {
    const systemMessage: AIMessage = {
      role: 'system',
      content: `You are a Kubernetes expert assistant. Analyze the provided cluster data and provide insightful recommendations about cluster health, resource utilization, and best practices. Be specific and actionable.`,
    };

    const userPrompt = question 
      ? `${question}\n\nCluster Data:\n${JSON.stringify(clusterData, null, 2)}`
      : `Analyze this Kubernetes cluster data and provide insights:\n${JSON.stringify(clusterData, null, 2)}`;

    const userMessage: AIMessage = {
      role: 'user',
      content: userPrompt,
    };

    return await this.chat([systemMessage, userMessage]);
  }

  /**
   * Test the AI provider connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testMessage: AIMessage = {
        role: 'user',
        content: 'Reply with "OK" if you can read this message.',
      };
      const response = await this.chat([testMessage]);
      return response.length > 0;
    } catch (error) {
      console.error('AI provider test connection failed:', error);
      return false;
    }
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return this.config.provider;
  }

  /**
   * Get the model name
   */
  getModelName(): string {
    return this.config.model || this.getDefaultModel();
  }

  private getDefaultModel(): string {
    switch (this.config.provider) {
      case 'openai':
        return 'gpt-3.5-turbo';
      case 'anthropic':
        return 'claude-3-sonnet-20240229';
      case 'gemini':
        return 'gemini-pro';
      default:
        return 'unknown';
    }
  }
}

/**
 * Create an AI provider service instance
 */
export function createAIProviderService(config: AIProviderConfig): AIProviderService {
  return new AIProviderService(config);
}
