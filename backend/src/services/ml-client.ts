import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
const path = require('path');
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { MLOperationResult } from '../types/database';

class MLClient {
  private baseUrl: string;
  private endpoints: { [key: string]: string };
  private timeout: number;

  private logNetworkError(operation: string, endpoint: string, error: any, context: any = {}, startTime?: number) {
    const duration = startTime ? Date.now() - startTime : undefined;
    const fullUrl = `${this.baseUrl}${endpoint}`;
    
    const errorInfo = {
      operation,
      url: fullUrl,
      error_type: this.getErrorType(error),
      error_message: error.message,
      http_status: error.response?.status,
      error_code: error.code,
      duration_ms: duration,
      network_info: {
        timeout_ms: this.timeout,
        is_timeout: error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT',
        is_connection_refused: error.code === 'ECONNREFUSED',
        is_network_error: !error.response && error.code,
        dns_resolution: error.code === 'ENOTFOUND' ? 'failed' : 'unknown'
      },
      ...context
    };

    logger.error('MLClient', `${operation} failed`, errorInfo);
  }

  private getErrorType(error: any): string {
    if (error.response?.status >= 500) return 'SERVER_ERROR';
    if (error.response?.status >= 400) return 'CLIENT_ERROR';
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'TIMEOUT';
    if (error.code === 'ECONNREFUSED') return 'CONNECTION_REFUSED';
    if (error.code === 'ENOTFOUND') return 'DNS_RESOLUTION_FAILED';
    if (error.code === 'ECONNRESET') return 'CONNECTION_RESET';
    if (!error.response && error.code) return 'NETWORK_ERROR';
    return 'UNKNOWN_ERROR';
  }

  private async performHealthCheck(): Promise<any> {
    const healthUrl = `${this.baseUrl}/api/v1/info/health_check`;
    const startTime = Date.now();
    
    try {
      const response = await axios.get(healthUrl, {
        timeout: 5000 // shorter timeout for health check
      });
      
      const duration = Date.now() - startTime;
      
      logger.info('MLClient', 'Health check successful', {
        url: healthUrl,
        status: response.status,
        duration_ms: duration,
        response_data: response.data,
        service_available: true
      });
      
      return {
        healthy: true,
        status: response.status,
        data: response.data,
        duration_ms: duration
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('MLClient', 'Health check failed', {
        url: healthUrl,
        error_type: this.getErrorType(error),
        error_message: error.message,
        error_code: error.code,
        http_status: error.response?.status,
        duration_ms: duration,
        network_diagnosis: {
          is_dns_issue: error.code === 'ENOTFOUND',
          is_connection_refused: error.code === 'ECONNREFUSED',
          is_timeout: error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT',
          is_network_unreachable: error.code === 'ENETUNREACH',
          port_accessible: error.code !== 'ECONNREFUSED'
        }
      });
      
      return {
        healthy: false,
        error: error.message,
        error_type: this.getErrorType(error),
        error_code: error.code,
        duration_ms: duration
      };
    }
  }

  private async logServiceConnectionAttempt(operation: string, endpoint: string, context: any = {}) {
    logger.info('MLClient', `Attempting ${operation} connection`, {
      operation,
      target_url: `${this.baseUrl}${endpoint}`,
      base_url: this.baseUrl,
      endpoint,
      network_check: 'pending',
      timeout_ms: this.timeout,
      ...context
    });

    // Perform health check before main operation
    const healthResult = await this.performHealthCheck();
    
    if (!healthResult.healthy) {
      logger.warn('MLClient', `${operation} attempted while ML service unhealthy`, {
        operation,
        target_url: `${this.baseUrl}${endpoint}`,
        health_check_result: healthResult,
        proceeding_anyway: true
      });
    } else {
      logger.info('MLClient', `${operation} proceeding with healthy ML service`, {
        operation,
        health_check_duration: healthResult.duration_ms,
        service_status: healthResult.status
      });
    }

    return healthResult;
  }

  constructor() {
    this.baseUrl = config.mlService.url;
    this.timeout = config.mlService.timeout || 30000;
    this.endpoints = {
      transcription: '/api/v1/speech/transcribe_speech',
      speechMetrics: '/api/v1/speech/get_speech_metrics', 
      textAnalytics: '/api/v1/text/get_text_analytics',
      questions: '/api/v1/text/get_questions_text_presentation'
    };
    
    logger.info('MLClient', 'Service configuration initialized', {
      baseUrl: this.baseUrl,
      endpoints: this.endpoints,
      timeoutMs: this.timeout,
      fullUrls: Object.keys(this.endpoints).reduce((acc, key) => {
        acc[key] = `${this.baseUrl}${this.endpoints[key]}`;
        return acc;
      }, {} as { [key: string]: string })
    });
  }

  async getTranscription(filePath: string): Promise<MLOperationResult<any[]>> {
    const startTime = Date.now();
    // verify converted WAV file exists and is readable before sending
    
    // prepare audio file (convert to WAV if needed)
    const wavPath = await this.prepareAudioFile(filePath);
    
    // analyze audio duration for debugging
    const originalDuration = await this.getAudioDuration(filePath);
    const wavDuration = filePath !== wavPath ? await this.getAudioDuration(wavPath) : originalDuration;
    
    logger.info('MLClient', 'Audio duration analysis completed', {
      originalFile: filePath.split('/').pop(),
      wavFile: wavPath.split('/').pop(),
      originalDurationSeconds: originalDuration,
      wavDurationSeconds: wavDuration,
      durationMatch: Math.abs(originalDuration - wavDuration) < 0.1
    });
    
    // verify converted WAV file exists and is readable before sending
    if (!fsSync.existsSync(wavPath)) {
      logger.error('MLClient', 'Converted file does not exist', { wavPath });
      throw new Error(`Converted file not found: ${wavPath}`);
    }
    
    const fileStats = fsSync.statSync(wavPath);
    const fileSize = fileStats.size;
    
    if (fileSize === 0) {
      logger.error('MLClient', 'Converted file is empty', { wavPath, size: 0 });
      throw new Error(`Converted file is empty: ${wavPath}`);
    }
    
    if (fileSize < 1024) { // less than 1KB is likely corrupted
      logger.error('MLClient', 'Converted WAV file suspiciously small', { 
        wavPath, 
        size: fileSize,
        originalPath: filePath 
      });
      throw new Error(`Converted WAV file too small (${fileSize} bytes), likely corrupted`);
    }
    
    // Perform health check and log connection attempt
    await this.logServiceConnectionAttempt('transcription', this.endpoints.transcription, {
      file_size_kb: Math.round(fileSize / 1024),
      audio_format: 'wav'
    });
    
    try {
      const transcribeForm = new FormData();
      transcribeForm.append('audio_file', createReadStream(wavPath));

      logger.info('MLClient', 'Starting transcription request', {
        originalFile: filePath.split('/').pop(),
        wavFile: wavPath.split('/').pop(),
        fileSizeKB: Math.round(fileSize / 1024),
        fileExists: fsSync.existsSync(wavPath),
        fileIsFile: fileStats.isFile(),
        endpoint: '/api/v1/speech/transcribe_speech'
      });
      
      const transcribeResponse = await axios.post(
        `${this.baseUrl}/api/v1/speech/transcribe_speech`,
        transcribeForm,
        {
          headers: {
            ...transcribeForm.getHeaders(),
          },
          timeout: 180000, // 3 minutes timeout for slow ML processing (based on analysis)
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );

      const duration = Date.now() - startTime;
      const transcriptionData = transcribeResponse.data;
      
      logger.info('MLClient', 'Transcription response received', { 
        duration: `${duration}ms`,
        status: transcribeResponse.status,
        responseType: typeof transcriptionData,
        isArray: Array.isArray(transcriptionData),
        segments: transcriptionData?.length || 0,
        fileSizeKB: Math.round(fileSize / 1024),
        avgProcessingSpeed: fileSize > 0 ? `${Math.round(fileSize / 1024 / (duration / 1000))} KB/s` : 'unknown',
        firstSegment: transcriptionData?.[0] ? JSON.stringify(transcriptionData[0]) : 'none',
        rawDataPreview: JSON.stringify(transcriptionData).substring(0, 200)
      });
      
      if (!transcriptionData || transcriptionData.length === 0) {
        logger.error('MLClient', 'Empty transcription received from ML service', {
          responseData: JSON.stringify(transcriptionData),
          responseHeaders: transcribeResponse.headers
        });
        
        return {
          success: false,
          error: {
            type: 'INVALID_RESPONSE',
            message: 'ML service returned empty transcription',
            httpStatus: transcribeResponse.status,
            retryable: true
          }
        };
      }
      
      return {
        success: true,
        data: transcriptionData
      };

    } catch (error: any) {
      // enhanced error logging with ML service response details
      const errorDetails = {
        file_size_kb: Math.round(fileSize / 1024),
        ml_response_status: error.response?.status,
        ml_response_data: error.response?.data ? JSON.stringify(error.response.data).substring(0, 500) : 'no response data',
        ml_response_headers: error.response?.headers ? Object.keys(error.response.headers) : [],
        file_exists_before_send: fsSync.existsSync(wavPath),
        file_size_before_send: fsSync.existsSync(wavPath) ? fsSync.statSync(wavPath).size : 0
      };
      
      this.logNetworkError('transcription', this.endpoints.transcription, error, errorDetails, startTime);
      
      return {
        success: false,
        error: {
          type: this.mapErrorToType(error),
          message: error.message || 'Transcription request failed',
          httpStatus: error.response?.status,
          retryable: this.isRetryableError(error)
        }
      };
    } finally {
      // DEBUG: keep WAV files for debugging duration issues
      if (wavPath !== filePath) {
        logger.info('MLClient', 'Preserving WAV file for debugging', { wavPath, originalFile: filePath });
      }
    }
  }


  async getMetrics(filePath: string, transcriptionData: any[]): Promise<MLOperationResult<any>> {
    const startTime = Date.now();
    // verify converted WAV file exists and is readable before sending
    
    // prepare audio file (convert to WAV if needed)
    const wavPath = await this.prepareAudioFile(filePath);
    const fileSize = fsSync.existsSync(wavPath) ? fsSync.statSync(wavPath).size : 0;
    
    // Perform health check and log connection attempt
    await this.logServiceConnectionAttempt('speech_metrics', this.endpoints.speechMetrics, {
      file_size_kb: Math.round(fileSize / 1024),
      transcription_segments: transcriptionData.length
    });

    try {
      const metricsForm = new FormData();
      metricsForm.append('audio_file', createReadStream(wavPath));
      metricsForm.append('text_timestamps', JSON.stringify(transcriptionData));

      logger.info('MLClient', 'Starting speech metrics request', {
        fileSizeKB: Math.round(fileSize / 1024),
        transcriptionSegments: transcriptionData.length,
        endpoint: this.endpoints.speechMetrics
      });
      
      const metricsResponse = await axios.post(
        `${this.baseUrl}/api/v1/speech/get_speech_metrics`,
        metricsForm,
        {
          headers: {
            ...metricsForm.getHeaders(),
          },
          timeout: 180000, // 3 minutes timeout for slow ML processing (based on analysis)
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );
      
      const duration = Date.now() - startTime;
      const processedData = this.processSpeechMetrics(metricsResponse.data);
      
      logger.info('MLClient', 'Speech metrics completed successfully', {
        duration: `${duration}ms`,
        pace_rate: processedData?.pace_rate,
        pace_mark: processedData?.pace_mark,
        pace_mark_fixed: processedData?.pace_mark !== metricsResponse.data?.pace_mark,
        emotion_mark: processedData?.emotion_mark,
        fileSizeKB: Math.round(fileSize / 1024)
      });
      
      return {
        success: true,
        data: processedData
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('MLClient', 'Speech metrics failed', {
        duration: `${duration}ms`,
        fileSizeKB: Math.round(fileSize / 1024),
        endpoint: '/api/v1/speech/get_speech_metrics',
        errorType: error.code || error.name || 'unknown',
        message: error.message,
        isTimeout: error.code === 'ECONNABORTED' || duration >= 120000
      });
      
      return {
        success: false,
        error: {
          type: this.mapErrorToType(error),
          message: error.message || 'Speech metrics request failed',
          httpStatus: error.response?.status,
          retryable: this.isRetryableError(error)
        }
      };
    } finally {
      // DEBUG: keep WAV files for debugging duration issues
      if (wavPath !== filePath) {
        logger.info('MLClient', 'Preserving WAV file for debugging', { wavPath, originalFile: filePath });
      }
    }
  }


  async getPitchAnalysis(text: string): Promise<MLOperationResult<any>> {
    const startTime = Date.now();
    
    // Perform health check and log connection attempt
    await this.logServiceConnectionAttempt('text_analytics', this.endpoints.textAnalytics, {
      text_length: text.length,
      content_preview: text.substring(0, 100) + '...'
    });
    
    try {
      logger.info('MLClient', 'Starting pitch analysis (using text analytics endpoint)', {
        textLength: text.length,
        endpoint: this.endpoints.textAnalytics
      });
      
      const response = await axios.post(
        `${this.baseUrl}/api/v1/text/get_text_analytics`,
        {},
        {
          params: {
            text: text
          },
          timeout: 30000 // 30 seconds timeout for text analysis (sufficient based on analysis)
        }
      );
      
      const duration = Date.now() - startTime;
      
      // check for empty or invalid response
      if (!response.data || Object.keys(response.data).length === 0) {
        logger.error('MLClient', 'Empty text analytics response from ML service', {
          duration: `${duration}ms`,
          responseData: JSON.stringify(response.data)
        });
        return {
          success: false,
          error: {
            type: 'INVALID_RESPONSE',
            message: 'ML service returned empty text analytics',
            httpStatus: response.status,
            retryable: true
          }
        };
      }
      
      // process text analytics response to fix data quality issues
      const processedData = this.processTextAnalytics(response.data);
      
      // convert new API format to expected format for backward compatibility
      const convertedData = {
        pitch_evaluation: {
          marks: processedData.marks || {
            structure: 5,
            clarity: 5,
            specificity: 5,
            persuasiveness: 5
          }
        },
        filler_words: processedData.filler_words || [],
        hesitant_phrases: processedData.hesitant_phrases || [],
        unclarity_moments: processedData.unclarity_moments || []
      };
      
      logger.info('MLClient', 'Text analytics completed successfully', {
        duration: `${duration}ms`,
        textLength: text.length,
        has_marks: !!processedData.marks,
        filler_words_count: processedData.filler_words?.length || 0,
        filler_words_fixed: processedData.filler_words !== response.data.filler_words,
        hesitant_phrases_count: processedData.hesitant_phrases?.length || 0,
        unclarity_moments_count: processedData.unclarity_moments?.length || 0
      });
      
      return {
        success: true,
        data: convertedData
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('MLClient', 'Text analytics failed', {
        duration: `${duration}ms`,
        textLength: text.length,
        errorStatus: error.response?.status,
        message: error.message
      });
      
      return {
        success: false,
        error: {
          type: this.mapErrorToType(error),
          message: error.message || 'Text analytics request failed',
          httpStatus: error.response?.status,
          retryable: this.isRetryableError(error)
        }
      };
    }
  }

  async generateQuestions(text: string, questionCount: number = 3): Promise<MLOperationResult<string[]>> {
    return this.generateQuestionsWithRetry(text, questionCount, 2); // retry up to 2 times
  }

  // question generation with retry logic (due to frequent 500 errors in ML API analysis)
  private async generateQuestionsWithRetry(text: string, questionCount: number, maxRetries: number): Promise<MLOperationResult<string[]>> {
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      const isRetry = attempt > 0;
      
      try {
        logger.info('MLClient', 'Starting question generation', { 
          count: questionCount,
          textLength: text.length,
          endpoint: '/api/v1/text/get_questions_text_presentation',
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          isRetry
        });
        
        // create form data for the new API format (multipart with optional presentation file)
        const form = new FormData();
        
        const response = await axios.post(
          `${this.baseUrl}/api/v1/text/get_questions_text_presentation`,
          form,
          {
            headers: {
              ...form.getHeaders(),
            },
            params: {
              text: text,
              n_questions: questionCount
            },
            timeout: 60000 // 1 minute timeout for question generation (increased due to 500 errors)
          }
        );
        
        const duration = Date.now() - startTime;
        const questions = response.data?.questions || [];
        
        // check for empty questions array
        if (!questions || questions.length === 0) {
          logger.error('MLClient', 'Empty questions response from ML service', {
            duration: `${duration}ms`,
            requestedCount: questionCount,
            responseData: JSON.stringify(response.data),
            attempt: attempt + 1
          });
          return {
            success: false,
            error: {
              type: 'INVALID_RESPONSE',
              message: 'ML service returned empty questions',
              httpStatus: response.status,
              retryable: true
            }
          };
        }
        
        logger.info('MLClient', 'Questions generated successfully', { 
          duration: `${duration}ms`,
          requestedCount: questionCount,
          actualCount: questions.length,
          attempt: attempt + 1,
          succeededAfterRetries: isRetry
        });
        
        return {
          success: true,
          data: questions
        };
        
      } catch (error: any) {
        const duration = Date.now() - startTime;
        const isServerError = error.response?.status >= 400;
        const is500Error = error.response?.status === 500;
        lastError = error;
        
        // only retry on 500 errors or network errors, not on client errors
        const shouldRetry = attempt < maxRetries && (is500Error || !isServerError);
        
        if (shouldRetry) {
          const waitTime = Math.min(1000 * (attempt + 1), 5000); // exponential backoff, max 5s
          logger.warn('MLClient', 'Question generation failed, retrying', {
            duration: `${duration}ms`,
            textLength: text.length,
            requestedCount: questionCount,
            errorStatus: error.response?.status,
            is500Error,
            isServerError,
            message: error.message,
            attempt: attempt + 1,
            maxAttempts: maxRetries + 1,
            retryAfterMs: waitTime
          });
          
          // wait before retrying
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          logger.error('MLClient', 'Question generation failed after retries', {
            duration: `${duration}ms`,
            textLength: text.length,
            requestedCount: questionCount,
            errorStatus: error.response?.status,
            isServerError,
            message: error.message,
            totalAttempts: attempt + 1,
            finalError: true
          });
          break;
        }
      }
    }
    
    // return error if all retries failed
    return {
      success: false,
      error: {
        type: this.mapErrorToType(lastError),
        message: lastError?.message || 'Questions generation failed after retries',
        httpStatus: lastError?.response?.status,
        retryable: false // all retries exhausted
      }
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/info/health_check`, {
        timeout: 5000 // 5 second timeout for health check
      });
      logger.info('MLClient', 'Health check successful', {
        endpoint: '/api/v1/info/health_check',
        status: response.status,
        responseTime: '< 5s'
      });
      return response.status === 200;
    } catch (error: any) {
      logger.warn('MLClient', 'Health check failed', {
        endpoint: '/api/v1/info/health_check',
        error: error.message,
        code: error.code,
        isTimeout: error.code === 'ECONNABORTED',
        isNetworkError: error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND'
      });
      return false;
    }
  }

  async getPresentationFeedback(text: string, presentationFile?: string): Promise<MLOperationResult<any>> {
    const startTime = Date.now();
    try {
      logger.info('MLClient', 'Starting presentation feedback analysis', {
        textLength: text.length,
        hasPresentation: !!presentationFile,
        endpoint: '/api/v1/text/get_text_presentation_feedback'
      });
      
      const form = new FormData();
      if (presentationFile) {
        form.append('presentation', createReadStream(presentationFile));
      }
      
      const response = await axios.post(
        `${this.baseUrl}/api/v1/text/get_text_presentation_feedback`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          params: {
            text: text
          },
          timeout: 60000 // 1 minute timeout for comprehensive analysis
        }
      );
      
      const duration = Date.now() - startTime;
      
      // check for empty or invalid response
      if (!response.data || Object.keys(response.data).length === 0) {
        logger.error('MLClient', 'Empty presentation feedback response from ML service', {
          duration: `${duration}ms`,
          responseData: JSON.stringify(response.data)
        });
        return {
          success: false,
          error: {
            type: 'INVALID_RESPONSE',
            message: 'ML service returned empty presentation feedback',
            httpStatus: response.status,
            retryable: true
          }
        };
      }
      
      logger.info('MLClient', 'Presentation feedback completed successfully', {
        duration: `${duration}ms`,
        textLength: text.length,
        pros_count: response.data.pros?.length || 0,
        cons_count: response.data.cons?.length || 0,
        recommendations_count: response.data.recommendations?.length || 0,
        has_feedback: !!response.data.feedback
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('MLClient', 'Presentation feedback failed', {
        duration: `${duration}ms`,
        textLength: text.length,
        errorStatus: error.response?.status,
        message: error.message
      });
      
      return {
        success: false,
        error: {
          type: this.mapErrorToType(error),
          message: error.message || 'Presentation feedback request failed',
          httpStatus: error.response?.status,
          retryable: this.isRetryableError(error)
        }
      };
    }
  }

  // helper method to extract text from transcription segments
  extractTextFromSegments(segments: any[]): string {
    if (!segments || segments.length === 0) return '';
    return segments.map(segment => segment.text || '').join(' ').trim();
  }

  // generate mock transcription data for testing when ML service returns empty
  private generateMockTranscription(): any[] {
    return [
      {
        start: 0.5,
        end: 4.8,
        text: "Добрый день, уважаемые коллеги! Меня зовут Александр, и сегодня я представляю вам инновационное решение для автоматизации бизнес-процессов."
      },
      {
        start: 5.0,
        end: 10.2,
        text: "Каждый день компании теряют до 40% рабочего времени на рутинные операции. Это приводит к снижению эффективности и упущенной прибыли."
      },
      {
        start: 10.5,
        end: 15.8,
        text: "Наша платформа использует искусственный интеллект для автоматизации повторяющихся задач, что позволяет сократить время обработки на 70%."
      },
      {
        start: 16.0,
        end: 21.3,
        text: "Ключевые преимущества: простая интеграция за 2 дня, снижение операционных расходов на 35%, и повышение точности обработки данных до 99%."
      },
      {
        start: 21.5,
        end: 26.7,
        text: "Мы уже помогли 50 компаниям оптимизировать их процессы. Средний ROI наших клиентов составляет 300% в первый год использования."
      },
      {
        start: 27.0,
        end: 30.2,
        text: "Давайте обсудим, как наше решение может трансформировать именно ваш бизнес. Спасибо за внимание!"
      }
    ];
  }

  // generate mock pitch analysis data when ML service fails
  private generateMockPitchAnalysis(text: string): any {
    const textLength = text?.length || 0;
    const shortText = textLength < 200;
    const mediumText = textLength >= 200 && textLength < 800;
    
    return {
      pitch_evaluation: {
        marks: {
          structure: shortText ? 4 : mediumText ? 6 : 7,
          clarity: shortText ? 5 : mediumText ? 7 : 8,
          specificity: shortText ? 3 : mediumText ? 5 : 6,
          persuasiveness: shortText ? 4 : mediumText ? 6 : 7
        },
        missing_blocks: shortText ? 
          ["проблема", "решение", "доказательства", "ценность", "призыв"] :
          mediumText ? 
          ["доказательства", "ценность", "призыв"] :
          ["ценность", "призыв"],
        pros: [
          "четкое структурированное изложение",
          shortText ? "краткость и конкретность" : "детальная проработка темы",
          "профессиональная подача материала"
        ],
        cons: shortText ? [
          "недостаточно деталей",
          "отсутствие конкретных примеров",
          "нет четкого призыва к действию"
        ] : mediumText ? [
          "можно добавить больше доказательств эффективности",
          "нет явного призыва к действию"
        ] : [
          "можно усилить эмоциональное воздействие",
          "добавить больше интерактивности с аудиторией"
        ]
      },
      advices: [
        {
          title: shortText ? "Добавить конкретные детали" : "Усилить доказательства",
          importance: "высокая",
          reason: shortText ? 
            "Короткое выступление требует максимальной информативности в каждой фразе" :
            "Аудитория нуждается в убедительных доказательствах ваших утверждений",
          todo: shortText ?
            "Включите конкретные цифры, факты и примеры в каждый ключевой момент" :
            "Добавьте статистику, кейсы клиентов, результаты исследований",
          example: shortText ?
            "Вместо 'экономим время' → 'экономим до 40% рабочего времени сотрудников'" :
            "Вместо 'наши клиенты довольны' → 'ROI клиентов составляет в среднем 300%'"
        },
        {
          title: "Добавить призыв к действию",
          importance: "средняя",
          reason: "Четкий призыв к действию направляет аудиторию к следующему шагу",
          todo: "Завершите выступление конкретным предложением для аудитории",
          example: "Завершите фразой: 'Давайте встретимся на следующей неделе и обсудим внедрение в вашей компании'"
        }
      ],
      pitch_summary: shortText ? 
        "Представлено краткое описание инновационного решения. Выступление требует дополнения конкретными деталями и доказательствами эффективности для усиления воздействия на аудиторию." :
        mediumText ?
        "Представлен детальный обзор инновационного продукта с описанием преимуществ и результатов. Презентация имеет хорошую структуру, но нуждается в усилении доказательной базы и четком призыве к действию." :
        "Представлена комплексная презентация инновационного решения с подробным описанием возможностей и достижений. Выступление демонстрирует глубокое понимание темы и профессиональный подход к презентации бизнес-решения."
    };
  }

  // generate mock questions when ML service fails  
  private generateMockQuestions(text: string, questionCount: number): string[] {
    const isBusinessPresentation = text?.toLowerCase().includes('бизнес') || 
                                   text?.toLowerCase().includes('компания') ||
                                   text?.toLowerCase().includes('решение') ||
                                   text?.toLowerCase().includes('продукт');
    
    const businessQuestions = [
      "Какие ключевые преимущества вашего решения перед конкурентами?",
      "Каков ожидаемый срок окупаемости инвестиций для клиентов?", 
      "Какие конкретные метрики эффективности вы можете гарантировать?",
      "Как происходит процесс внедрения и интеграции с существующими системами?",
      "Какая поддержка предоставляется клиентам после внедрения?",
      "Можете ли привести примеры успешных кейсов ваших клиентов?",
      "Как вы планируете масштабировать решение для крупных предприятий?",
      "Какие риски могут возникнуть при внедрении и как их минимизировать?"
    ];

    const generalQuestions = [
      "Какие основные моменты вашего выступления требуют дополнительного разъяснения?",
      "Как вы планируете развивать представленную идею в будущем?",
      "Какие вопросы от аудитории вы ожидаете чаще всего?",
      "На какую целевую аудиторию ориентировано ваше предложение?",
      "Какие дополнительные материалы могут помочь в понимании темы?",
      "Как можно измерить эффективность представленного подхода?",
      "Какие альтернативные варианты решения вы рассматривали?",
      "Что может стать препятствием для реализации вашего предложения?"
    ];

    const questions = isBusinessPresentation ? businessQuestions : generalQuestions;
    
    // return requested number of questions, but at least 3
    const count = Math.max(questionCount, 3);
    const selectedQuestions: string[] = [];
    
    // select questions based on text length and content
    for (let i = 0; i < count && i < questions.length; i++) {
      selectedQuestions.push(questions[i]);
    }
    
    // if we need more questions than available, add generic ones
    while (selectedQuestions.length < count) {
      selectedQuestions.push(`Какие дополнительные аспекты темы стоит рассмотреть подробнее? (Вопрос ${selectedQuestions.length + 1})`);
    }
    
    return selectedQuestions.slice(0, count);
  }

  // prepare audio file for ML service (convert to WAV if needed)
  private async prepareAudioFile(audioPath: string): Promise<string> {
    const ext = path.extname(audioPath).toLowerCase();
    
    // if already WAV, return as-is
    if (ext === '.wav') {
      logger.debug('MLClient', 'Audio file already in WAV format', { audioPath });
      return audioPath;
    }
    
    // convert to WAV
    const wavPath = audioPath.replace(ext, '.wav');
    logger.info('MLClient', 'Converting audio file to WAV format', {
      originalFile: audioPath.split('/').pop(),
      originalFormat: ext,
      targetFile: wavPath.split('/').pop()
    });
    
    await this.convertToWav(audioPath, wavPath);
    return wavPath;
  }
  
  // get audio duration using ffprobe
  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        audioPath
      ];
      
      logger.debug('MLClient', 'Getting audio duration with ffprobe', {
        command: 'ffprobe',
        args: args.join(' '),
        file: audioPath.split('/').pop()
      });
      
      const ffprobe = spawn('ffprobe', args);
      
      let stdout = '';
      let stderr = '';
      
      ffprobe.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      ffprobe.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      
      ffprobe.on('close', (code: number) => {
        if (code === 0) {
          const duration = parseFloat(stdout.trim());
          if (isNaN(duration)) {
            logger.warn('MLClient', 'Failed to parse audio duration', { 
              stdout, 
              stderr: stderr.substring(0, 200),
              file: audioPath.split('/').pop()
            });
            resolve(0);
          } else {
            logger.info('MLClient', 'Audio duration retrieved successfully', {
              duration: `${duration.toFixed(2)}s`,
              file: audioPath.split('/').pop()
            });
            resolve(duration);
          }
        } else {
          logger.error('MLClient', 'ffprobe failed to get duration', {
            exitCode: code,
            stderr: stderr.substring(0, 200),
            file: audioPath.split('/').pop()
          });
          resolve(0); // return 0 on error rather than rejecting
        }
      });
      
      ffprobe.on('error', (error: any) => {
        logger.error('MLClient', 'ffprobe process error', {
          error: error.message,
          file: audioPath.split('/').pop()
        });
        resolve(0); // return 0 on error rather than rejecting
      });
    });
  }
  
  // convert audio file to WAV format using FFmpeg
  private async convertToWav(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,           // input file
        '-acodec', 'pcm_s16le',    // WAV codec (16-bit PCM)
        '-ar', '16000',            // sample rate 16kHz (optimal for speech recognition)
        '-ac', '1',                // mono channel
        '-y',                      // overwrite output file if exists
        outputPath                 // output WAV file
      ];
      
      logger.debug('MLClient', 'Starting FFmpeg conversion', {
        command: 'ffmpeg',
        args: args.join(' '),
        inputFile: inputPath.split('/').pop(),
        outputFile: outputPath.split('/').pop()
      });
      
      const ffmpeg = spawn('ffmpeg', args);
      
      let stderrOutput = '';
      
      ffmpeg.stderr.on('data', (data: any) => {
        stderrOutput += data.toString();
      });
      
      ffmpeg.on('close', (code: any) => {
        if (code === 0) {
          logger.info('MLClient', 'Audio conversion completed successfully', {
            inputFile: inputPath.split('/').pop(),
            outputFile: outputPath.split('/').pop(),
            exitCode: code
          });
          resolve();
        } else {
          logger.error('MLClient', 'Audio conversion failed', {
            inputFile: inputPath.split('/').pop(),
            outputFile: outputPath.split('/').pop(),
            exitCode: code,
            stderr: stderrOutput.slice(-500) // last 500 chars of stderr
          });
          reject(new Error(`FFmpeg conversion failed with exit code ${code}: ${stderrOutput.slice(-200)}`));
        }
      });
      
      ffmpeg.on('error', (error: any) => {
        logger.error('MLClient', 'FFmpeg process error', {
          inputFile: inputPath.split('/').pop(),
          error: error.message
        });
        reject(error);
      });
    });
  }

  // generate mock presentation feedback when ML service fails
  private generateMockPresentationFeedback(text: string): any {
    const textLength = text?.length || 0;
    const shortText = textLength < 200;
    const mediumText = textLength >= 200 && textLength < 800;
    
    return {
      pros: shortText ? [
        "четкое и краткое изложение основных моментов",
        "хорошее структурирование информации"
      ] : mediumText ? [
        "детальная проработка темы с конкретными примерами",
        "логичная последовательность изложения",
        "профессиональный подход к презентации"
      ] : [
        "всесторонний анализ предметной области",
        "убедительная аргументация с фактами и цифрами",
        "профессиональная подача материала",
        "хорошо структурированное повествование"
      ],
      
      cons: shortText ? [
        "недостаточно деталей для полного понимания",
        "отсутствие конкретных примеров",
        "нет четкого призыва к действию",
        "требуется больше аргументации"
      ] : mediumText ? [
        "можно добавить больше статистических данных",
        "нет четкого призыва к действию",
        "стоит усилить эмоциональную составляющую"
      ] : [
        "можно сократить некоторые детали для большей концентрации",
        "добавить больше интерактивности с аудиторией",
        "усилить финальный призыв к действию"
      ],
      
      recommendations: shortText ? [
        "Добавить конкретные примеры и цифры для подтверждения утверждений",
        "Расширить описание ключевых преимуществ решения",
        "Включить четкий призыв к действию в заключение",
        "Добавить информацию о результатах или достижениях"
      ] : mediumText ? [
        "Включить больше количественных показателей эффективности",
        "Добавить кейсы успешного применения решения",
        "Усилить заключительную часть конкретным призывом",
        "Рассмотреть возможность добавления визуальных элементов"
      ] : [
        "Оптимизировать структуру для лучшего восприятия ключевых моментов",
        "Добавить элементы интерактивности для вовлечения аудитории",
        "Усилить эмоциональное воздействие в ключевых моментах",
        "Включить более конкретный план действий для аудитории"
      ],
      
      feedback: shortText ? 
        "Презентация демонстрирует понимание темы, но нуждается в расширении и добавлении конкретных деталей. Рекомендуется включить больше примеров, статистики и четкий призыв к действию для усиления воздействия на аудиторию." :
        mediumText ?
        "Качественная презентация с хорошей структурой и детальной проработкой темы. Для повышения эффективности рекомендуется добавить больше количественных показателей и усилить заключительную часть с конкретными предложениями для аудитории." :
        "Профессиональная и всесторонняя презентация, демонстрирующая глубокое понимание предметной области. Материал хорошо структурирован и содержит убедительную аргументацию. Для максимального эффекта стоит добавить больше интерактивных элементов и усилить эмоциональную составляющую."
    };
  }

  // process speech metrics response to fix data quality issues from ML API analysis
  private processSpeechMetrics(rawResponse: any): any {
    if (!rawResponse) return rawResponse;

    const processed = { ...rawResponse };

    // fix pace_mark = 0 issue: calculate from pace_rate when pace_mark is 0 or missing
    if (processed.pace_mark === 0 || processed.pace_mark === null || processed.pace_mark === undefined) {
      processed.pace_mark = this.calculatePaceMarkFromRate(processed.pace_rate);
      logger.info('MLClient', 'Fixed pace_mark calculation', {
        original_pace_mark: rawResponse.pace_mark,
        fixed_pace_mark: processed.pace_mark,
        pace_rate: processed.pace_rate
      });
    }

    return processed;
  }

  // process text analytics response to fix data quality issues from ML API analysis
  private processTextAnalytics(rawResponse: any): any {
    if (!rawResponse) return rawResponse;

    const processed = { ...rawResponse };

    // fix filler_words = null issue: convert null to empty array
    if (processed.filler_words === null || processed.filler_words === undefined) {
      processed.filler_words = [];
      logger.info('MLClient', 'Fixed filler_words null conversion', {
        original_value: rawResponse.filler_words,
        fixed_value: processed.filler_words
      });
    }

    // ensure hesitant_phrases and unclarity_moments are arrays (not null)
    if (processed.hesitant_phrases === null || processed.hesitant_phrases === undefined) {
      processed.hesitant_phrases = [];
    }
    
    if (processed.unclarity_moments === null || processed.unclarity_moments === undefined) {
      processed.unclarity_moments = [];
    }

    return processed;
  }

  // calculate pace_mark from pace_rate based on ML API analysis insights
  private calculatePaceMarkFromRate(rate: number): number {
    if (!rate || rate <= 0) return 5; // default middle score for invalid rate

    // optimal speech pace ranges based on speech analysis best practices:
    if (rate < 80) return 3;     // too slow
    if (rate < 120) return 5;    // slow but acceptable  
    if (rate >= 120 && rate <= 180) return 8;   // ideal pace range
    if (rate <= 220) return 6;   // fast but manageable
    return 4;                    // too fast

    // rate 85.71 (from analysis) should map to 5 (slow but acceptable)
  }

  // helper methods for error handling
  private mapErrorToType(error: any): 'NETWORK_ERROR' | 'SERVICE_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE' {
    if (error.response?.status >= 500) return 'SERVICE_ERROR';
    if (error.response?.status >= 400) return 'INVALID_RESPONSE';
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'TIMEOUT';
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') return 'NETWORK_ERROR';
    return 'NETWORK_ERROR';
  }

  private isRetryableError(error: any): boolean {
    // network errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') return true;
    // timeouts are retryable
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return true;
    // 5xx server errors are retryable
    if (error.response?.status >= 500) return true;
    // 4xx client errors are generally not retryable, except for some specific cases
    if (error.response?.status === 429) return true; // rate limiting
    return false;
  }
}

export const mlClient = new MLClient();