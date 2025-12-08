import axios, { AxiosInstance } from 'axios';
import { CONFIG } from '../config';

class BackendAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: CONFIG.BACKEND_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.BACKEND_API_KEY,
      },
      timeout: 30000,
    });
  }

  /**
   * Get all active drying processes for Menu command
   */
  async getActiveProcesses() {
    try {
      const response = await this.client.get('/telegram/menu');
      return response.data;
    } catch (error) {
      console.error('Error fetching active processes:', error);
      throw error;
    }
  }

  /**
   * Get detailed status for a specific batch
   */
  async getBatchStatus(batchId: string) {
    try {
      const response = await this.client.get(`/telegram/batch/${batchId}/status`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching status for ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Get completion estimate for a batch
   */
  async getBatchEstimate(batchId: string) {
    try {
      const response = await this.client.get(`/telegram/batch/${batchId}/estimate`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching estimate for ${batchId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new drying reading from telegram bot
   */
  async createReading(data: {
    batchId: string;
    humidity?: number;
    electricityMeter?: number;
    lukuMeterImageUrl?: string;
    humidityMeterImageUrl?: string;
    photoTimestamp?: string;
    ocrConfidence?: number;
    notes?: string;
  }) {
    try {
      const response = await this.client.post('/telegram/reading', data);
      return response.data;
    } catch (error) {
      console.error('Error creating reading:', error);
      throw error;
    }
  }

  /**
   * Upload image to Cloudinary via backend
   */
  async uploadImage(imageBuffer: Buffer, filename: string) {
    try {
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
      formData.append('image', blob, filename);

      const response = await this.client.post('/telegram/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Get list of all active batches (for selection buttons)
   */
  async getActiveBatches() {
    try {
      const response = await this.client.get('/telegram/batches/active');
      return response.data;
    } catch (error) {
      console.error('Error fetching active batches:', error);
      throw error;
    }
  }
}

export const backendAPI = new BackendAPI();
