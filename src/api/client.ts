import type { Block, BlockCreate, BlockUpdate } from '../types/block';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  async getBlocks(docId: string): Promise<Block[]> {
    const response = await this.request<Block[]>(`/blocks/${docId}`);
    return response.data || [];
  }

  async getBlock(id: string): Promise<Block | null> {
    const response = await this.request<Block>(`/block/${id}`);
    return response.data || null;
  }

  async createBlock(block: BlockCreate): Promise<Block> {
    const response = await this.request<Block>('/blocks', {
      method: 'POST',
      body: JSON.stringify(block),
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || '创建失败');
    }
    return response.data;
  }

  async updateBlock(id: string, updates: BlockUpdate): Promise<Block | null> {
    const response = await this.request<Block>(`/block/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data || null;
  }

  async deleteBlock(id: string): Promise<boolean> {
    const response = await this.request<boolean>(`/block/${id}`, {
      method: 'DELETE',
    });
    return response.data || false;
  }
}

export const apiClient = new ApiClient();
