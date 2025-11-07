export interface APIConfig {
  hostname: string;
  apiKey?: string;
}

export interface Model {
  id: string;
  name: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}

export interface EmbeddingRequest {
  model: string;
  input: string;
}

class APIService {
  private normalizeHostname(hostname: string): string {
    let normalized = hostname.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized.replace(/\/$/, '');
  }

  private getHeaders(apiKey?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = apiKey;
    }

    return headers;
  }

  async fetchModels(config: APIConfig): Promise<Model[]> {
    const baseUrl = this.normalizeHostname(config.hostname);
    const url = `${baseUrl}/v1/models`;

    const response = await fetch(url, {
      headers: this.getHeaders(config.apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.data && Array.isArray(data.data)) {
      return data.data.map((model: { id: string; name?: string }) => ({
        id: model.id,
        name: model.name || model.id,
      }));
    }

    if (data.models && Array.isArray(data.models)) {
      return data.models.map((model: { name: string; model?: string }) => ({
        id: model.model || model.name,
        name: model.name,
      }));
    }

    return [];
  }

  async sendChatMessage(
    config: APIConfig,
    request: ChatRequest
  ): Promise<string> {
    const baseUrl = this.normalizeHostname(config.hostname);
    const url = `${baseUrl}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config.apiKey),
      body: JSON.stringify({
        ...request,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    if (data.message?.content) {
      return data.message.content;
    }

    throw new Error('Unexpected response format');
  }

  async getEmbedding(
    config: APIConfig,
    request: EmbeddingRequest
  ): Promise<number[]> {
    const baseUrl = this.normalizeHostname(config.hostname);
    const url = `${baseUrl}/v1/embeddings`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(config.apiKey),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding request failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (data.data && data.data[0]?.embedding) {
      return data.data[0].embedding;
    }

    if (data.embedding) {
      return data.embedding;
    }

    throw new Error('Unexpected embedding response format');
  }

  async readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

export const apiService = new APIService();
