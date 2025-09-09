import { useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioRecordingData } from '../types/recording';
import { useRecording } from '../contexts/RecordingContext';
import { audioLogger, sseLogger } from '../utils/logger';

interface UseAudioRecorderProps {
  onRecordingStart?: () => void;
  onRecordingComplete?: (data: AudioRecordingData) => void;
  sessionType?: string;
}

export const useAudioRecorder = ({
  onRecordingStart,
  onRecordingComplete,
  sessionType = 'presentation'
}: UseAudioRecorderProps) => {
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  
  // Debug logging (commented out to reduce spam)
  // console.log('=== useAudioRecorder initialized ===');
  // console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  // console.log('baseUrl:', baseUrl);
  
  
  const navigate = useNavigate();
  const { state, actions } = useRecording();
  
  // track component mount state
  const isMountedRef = useRef(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunks = useRef<Float32Array[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // convert float32 array to WAV blob
  const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  };

  const writeWAVHeader = (view: DataView, sampleRate: number, numChannels: number, samples: number) => {
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    
    // RIFF chunk descriptor
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * blockAlign, true);
    writeString(8, 'WAVE');
    
    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // subchunk1 size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    
    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, samples * blockAlign, true);
  };

  const createWAVBlob = useCallback((chunks: Float32Array[], sampleRate: number): Blob => {
    const length = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    writeWAVHeader(view, sampleRate, 1, length);
    
    let offset = 44;
    for (const chunk of chunks) {
      floatTo16BitPCM(view, offset, chunk);
      offset += chunk.length * 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }, []);

  // upload recorded audio to backend
  const uploadAudio = useCallback(async (audioBlob: Blob, sessionType?: string, title?: string) => {
    console.log('=== UPLOAD AUDIO FUNCTION CALLED ===');
    console.log('audioBlob:', audioBlob, 'size:', audioBlob.size);
    console.log('sessionType:', sessionType, 'title:', title);
    
    // First, test simple GET request
    try {
      console.log('Testing simple GET request to:', `${baseUrl}/api/audio/test`);
      const testResponse = await fetch(`${baseUrl}/api/audio/test`);
      const testData = await testResponse.json();
      console.log('Test response:', testData);
    } catch (error) {
      console.error('Test request failed:', error);
      return; // Exit if even simple request fails
    }
    
    audioLogger.info('Starting upload/analysis, showing modal');
    actions.setStatus('processing');
    actions.setShowAnalysisModal(true);
    audioLogger.debug('Modal should be visible now');
    
    // Convert blob to base64 for JSON upload (workaround for multipart issues)
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    const chunkSize = 65536; // Process 64KB chunks at a time
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Audio = btoa(binaryString);
    
    const uploadData = {
      audioData: base64Audio,
      sessionType: sessionType || 'presentation',
      title: title || `Запись от ${new Date().toLocaleString()}`,
      userId: 'default-user'
    };

    let eventSource: EventSource | null = null;
    let completionTimeout: NodeJS.Timeout | null = null;

    // cleanup function
    const cleanup = () => {
      if (eventSource) {
        sseLogger.debug('Closing EventSource connection');
        eventSource.close();
        eventSource = null;
      }
      if (completionTimeout) {
        clearTimeout(completionTimeout);
        completionTimeout = null;
      }
    };

    try {
        console.log('=== UPLOAD AUDIO START (JSON) ===');
        console.log('Base URL:', baseUrl);
        console.log('Full URL:', `${baseUrl}/api/audio/upload-json`);
        console.log('Upload data size:', base64Audio.length, 'chars');
        console.log('SessionType:', sessionType);
        
        console.log('Starting JSON fetch (no timeout)...');
        
        const response = await fetch(`${baseUrl}/api/audio/upload-json`, {
          method: 'POST',
          body: JSON.stringify(uploadData),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('=== FETCH COMPLETED ===');
        console.log('Response status:', response.status);
        
        console.log('Fetch response:', response.status, response.statusText);
        console.log('Fetch response headers:', response.headers);

        if (response.ok) {
          const data = await response.json();
          audioLogger.info('Upload successful', { sessionId: data.sessionId });
          actions.setStatus('analyzing');
          
          // directly connect to SSE stream
          sseLogger.info(`Connecting to SSE stream`, {
            sessionId: data.sessionId,
            url: `${baseUrl}/api/audio/session/${data.sessionId}/stream`
          });
          
          eventSource = new EventSource(`${baseUrl}/api/audio/session/${data.sessionId}/stream`);
          sseLogger.debug('EventSource created successfully');
          
          // No timeout - let SSE complete
          
          eventSource.onopen = () => {
            sseLogger.info('SSE connection opened');
          };
          
          eventSource.onmessage = (event) => {
              try {
                // ignore heartbeat messages
                if (event.data === ':heartbeat') {
                  return;
                }
                
                const progressData = JSON.parse(event.data);
                sseLogger.debug('Progress update', progressData);
                
                // update progress bar
                actions.setAnalysisProgress(progressData.progress);
                
                // handle different stages
                switch (progressData.stage) {
                  case 'initializing':
                  case 'processing_started':
                    actions.setStatus('analyzing');
                    break;
                  case 'transcribing_audio':
                    actions.setStatus('analyzing');
                    break;
                  case 'transcription_completed':
                  case 'metrics_completed':
                  case 'metrics_skipped':
                    actions.setStatus('analyzing');
                    break;
                  case 'timeout':
                    sseLogger.warn('SSE timeout from server');
                    cleanup();
                    // No timeout to clear
                    actions.setStatus('error');
                    actions.setShowAnalysisModal(false);
                    break;
                  case 'completed':
                    audioLogger.info('=== COMPLETED EVENT RECEIVED ===');
                    
                    actions.setAnalysisProgress(100);
                    // No timeout to clear
                    
                    actions.setStatus('completed');
                    actions.setShowAnalysisModal(false);
                    
                    if (onRecordingComplete) {
                      onRecordingComplete({
                        sessionId: progressData.sessionId,
                        audioBlob,
                        mlResults: progressData.data
                      });
                    }
                    
                    // Let SessionHistory handle navigation to details tab
                    // navigate('/history'); // Removed - will be handled by SessionHistory
                    
                    cleanup();
                    break;
                  case 'error':
                    // No timeout to clear
                    actions.setStatus('error');
                    actions.setShowAnalysisModal(false);
                    audioLogger.error('Analysis failed', progressData.error);
                    cleanup();
                    break;
                }
              } catch (error) {
                sseLogger.error('Failed to parse SSE event', error);
              }
            };
            
            eventSource.onerror = (error) => {
              sseLogger.error('SSE connection error', error);
              // No timeout to clear
              actions.setStatus('error');
              actions.setShowAnalysisModal(false);
              cleanup();
            };
          
          audioLogger.info('Upload successful, SSE connection established');
        } else {
          throw new Error('upload failed');
        }
      } catch (error) {
        // only upload errors should trigger mock simulation
        console.log('=== UPLOAD ERROR ===');
        if (error.name === 'AbortError') {
          console.log('Upload timed out after 10 seconds');
        } else {
          console.log('Upload failed with error:', error);
        }
        console.error('Fetch failed:', error);
        audioLogger.warn('Upload failed, using simulation mode', error);
        actions.setStatus('analyzing');
        
        // simulate analysis progress
        let progress = 0;
        const simulateProgress = setInterval(() => {
          progress += Math.random() * 15 + 10;
          if (progress >= 100) {
            progress = 100;
            clearInterval(simulateProgress);
            
            setTimeout(() => {
              actions.setStatus('completed');
              actions.setShowAnalysisModal(false);
              
              const mockSessionId = `mock_session_${Date.now()}`;
              const mockMlResults = {
                transcript: "Моковая расшифровка речи",
                sentiment: "positive",
                confidence: 0.85
              };
              
              if (onRecordingComplete) {
                onRecordingComplete({
                  sessionId: mockSessionId,
                  audioBlob,
                  mlResults: mockMlResults
                });
              }
              
              console.log('mock analysis completed');
              // Let SessionHistory handle navigation to details tab
              // navigate('/history'); // Removed - will be handled by SessionHistory
            }, 1500);
          } else {
            actions.setAnalysisProgress(progress);
          }
        }, 800);
      }
  }, [baseUrl, actions, onRecordingComplete, navigate]);

  // start recording with Web Audio API for WAV
  const startRecording = useCallback(async () => {
    console.log('startRecording called - attempting to start audio recording...');
    try {
      actions.setStatus('recording');
      actions.setActualRecordingTime(0);
      recordedChunks.current = [];

      // request microphone permission
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      console.log('Microphone access granted, stream:', stream);
      streamRef.current = stream;

      // create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 44100
      });
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // create script processor (deprecated but still works for WAV recording)
      const bufferSize = 4096;
      processorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      
      processorRef.current.onaudioprocess = (e: AudioProcessingEvent) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const chunk = new Float32Array(inputData);
        recordedChunks.current.push(chunk);
      };
      
      // connect nodes
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // start timer
      console.log('Starting recording timer...');
      timerRef.current = setInterval(() => {
        console.log('Timer tick - incrementing recording time');
        actions.setActualRecordingTime(prev => {
          console.log('Recording time:', prev, '->', prev + 1);
          return prev + 1;
        });
      }, 1000);
      
      if (onRecordingStart) {
        console.log('Calling onRecordingStart callback');
        onRecordingStart();
      }
      
      console.log('Recording started successfully');
      
    } catch (error) {
      console.error('failed to start recording:', error);
      actions.setStatus('error');
      alert('не удалось получить доступ к микрофону. проверьте разрешения.');
    }
  }, [actions, onRecordingStart]);

  // stop recording
  const stopRecording = useCallback(async () => {
    console.log('Stopping recording and media stream');
    
    // immediately stop media stream first
    if (streamRef.current) {
      console.log('Stopping media tracks:', streamRef.current.getTracks().length);
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
        console.log('Stopping track:', track.kind, track.readyState);
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (processorRef.current && sourceRef.current) {
      actions.setStatus('processing');
      
      // stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // disconnect nodes
      sourceRef.current.disconnect();
      processorRef.current.disconnect();
      
      // create WAV blob
      const wavBlob = createWAVBlob(recordedChunks.current, audioContextRef.current?.sampleRate || 44100);
      console.log('=== STOP RECORDING ===');
      console.log('WAV blob created:', wavBlob.size, 'bytes');
      console.log('Calling uploadAudio with sessionType:', sessionType);
      
      // upload audio with session metadata
      await uploadAudio(wavBlob, sessionType, `Запись от ${new Date().toLocaleString()}`);
      
      // cleanup audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [actions, uploadAudio, createWAVBlob, sessionType]);

  // start countdown before recording
  const startCountdown = useCallback(() => {
    console.log('Starting countdown...');
    actions.setStatus('countdown');
    actions.setCountdown(3);
    actions.setHasStarted(true);
    
    let currentCount = 3;
    
    const countdownInterval = setInterval(() => {
      currentCount--;
      console.log('Countdown:', currentCount);
      
      if (currentCount <= 0) {
        clearInterval(countdownInterval);
        actions.setCountdown(0);
        console.log('Countdown finished, starting recording in 500ms...');
        // wait a bit to show "Начинайте!" then start recording
        startRecording()
      } else {
        actions.setCountdown(currentCount);
      }
    }, 1000);
  }, [actions, startRecording]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      // mark component as unmounted
      isMountedRef.current = false;
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    startCountdown,
    stopRecording,
    state,
    actions
  };
};