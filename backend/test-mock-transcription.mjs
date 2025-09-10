#!/usr/bin/env node

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3000';

async function testMockTranscription() {
  console.log('[TEST-MOCK] Starting mock transcription test...');
  
  try {
    // create a small test WAV file (or use existing)
    const testFilePath = './uploads/test-mock.wav';
    
    // check if we have a test file, if not create a minimal one
    if (!fs.existsSync(testFilePath)) {
      console.log('[TEST-MOCK] Creating minimal test audio file...');
      // create minimal WAV header (44 bytes) + some data
      const buffer = Buffer.alloc(100);
      // WAV header
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(92, 4); // file size - 8
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16); // fmt chunk size
      buffer.writeUInt16LE(1, 20); // PCM format
      buffer.writeUInt16LE(1, 22); // mono
      buffer.writeUInt32LE(8000, 24); // sample rate
      buffer.writeUInt32LE(8000, 28); // byte rate
      buffer.writeUInt16LE(1, 32); // block align
      buffer.writeUInt16LE(8, 34); // bits per sample
      buffer.write('data', 36);
      buffer.writeUInt32LE(56, 40); // data size
      
      fs.writeFileSync(testFilePath, buffer);
    }
    
    // upload file via streaming endpoint
    console.log('[TEST-MOCK] Uploading test file to backend...');
    
    const audioBuffer = fs.readFileSync(testFilePath);
    const metadata = {
      sessionType: 'test',
      title: 'Mock Test Session',
      userId: 'test-user'
    };
    
    const response = await axios.post(
      `${API_URL}/api/audio/upload-stream`,
      audioBuffer,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Metadata': Buffer.from(JSON.stringify(metadata)).toString('base64')
        }
      }
    );
    
    const { sessionId } = response.data;
    console.log('[TEST-MOCK] Session created:', sessionId);
    
    // wait a bit for processing
    console.log('[TEST-MOCK] Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // get session status
    const statusResponse = await axios.get(`${API_URL}/api/audio/session/${sessionId}`);
    const session = statusResponse.data.session;
    
    console.log('[TEST-MOCK] Session status:', session.status);
    
    if (session.mlResults?.speech_segments) {
      console.log('[TEST-MOCK] ✅ Mock transcription received!');
      console.log('[TEST-MOCK] Segments count:', session.mlResults.speech_segments.length);
      console.log('[TEST-MOCK] First segment:', JSON.stringify(session.mlResults.speech_segments[0], null, 2));
      console.log('[TEST-MOCK] Total duration:', session.mlResults.speech_segments[session.mlResults.speech_segments.length - 1].end, 'seconds');
    } else {
      console.log('[TEST-MOCK] ❌ No transcription data in response');
    }
    
    // cleanup - delete test session
    await axios.delete(`${API_URL}/api/audio/session/${sessionId}`);
    console.log('[TEST-MOCK] Test session cleaned up');
    
  } catch (error) {
    console.error('[TEST-MOCK] Test failed:', error.message);
    if (error.response) {
      console.error('[TEST-MOCK] Response status:', error.response.status);
      console.error('[TEST-MOCK] Response data:', error.response.data);
    }
    console.error('[TEST-MOCK] Full error:', error);
  }
}

testMockTranscription();