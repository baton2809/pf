import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { config } from '../utils/config';

class MLClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.mlService.url;
    console.log('MLClient initialized with URL:', this.baseUrl);
  }

  async getTranscription(filePath: string): Promise<any[]> {
    try {
      const transcribeForm = new FormData();
      transcribeForm.append('audio_file', createReadStream(filePath));

      console.log('calling ML service transcription...');
      const transcribeResponse = await axios.post(
        `${this.baseUrl}/api/v1/speech/transcribe_speech`,
        transcribeForm,
        {
          headers: {
            ...transcribeForm.getHeaders(),
          }
          // No timeout - let the request complete
        }
      );

      const transcriptionData = transcribeResponse.data;
      console.log('transcription received:', transcriptionData);
      
      // if ML service returns empty array, return empty array (no fallback mock data)
      if (!transcriptionData || transcriptionData.length === 0) {
        console.log('ML service returned empty transcription, returning empty array');
        return [];
      }
      
      return transcriptionData;

    } catch (error) {
      console.error('transcription failed:', error instanceof Error ? error.message : 'unknown error');
      return []; // Return empty array instead of fallback mock data
    }
  }


  async getMetrics(filePath: string, transcriptionData: any[]): Promise<any | null> {
    try {
      const metricsForm = new FormData();
      metricsForm.append('audio_file', createReadStream(filePath));
      metricsForm.append('text_timestamps', JSON.stringify(transcriptionData));

      console.log('calling ML service metrics...');
      
      // No timeout - let the request complete
      const metricsResponse = await axios.post(
        `${this.baseUrl}/api/v1/speech/get_speech_metrics`,
        metricsForm,
        {
          headers: {
            ...metricsForm.getHeaders(),
          }
          // No timeout - let the request complete
        }
      );
      console.log('metrics received:', metricsResponse.data);
      return metricsResponse.data;

    } catch (error) {
      console.error('metrics failed:', error instanceof Error ? error.message : 'unknown error');
      return null;
    }
  }

  // legacy method for backward compatibility - returns only real ML data
  async analyzeAudio(filePath: string): Promise<any> {
    const transcriptionData = await this.getTranscription(filePath);
    return {
      speech_segments: transcriptionData,
      metrics: null,
      temp_rate: 1.2
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

export const mlClient = new MLClient();