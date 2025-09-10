#!/usr/bin/env node

import FormData from 'form-data';
import axios from 'axios';
import fs from 'fs';

const filePath = process.argv[2] || './uploads/fd5afb83-1c26-4657-8587-fcceee6b1e23_stream.wav';

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

console.log('🔍 Testing ML Service directly');
console.log(`File: ${filePath}`);
console.log(`Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);

const form = new FormData();
form.append('audio_file', fs.createReadStream(filePath));

console.log('\n📤 Sending to ML service...');
console.log('URL: http://89.169.190.223:4000/api/v1/speech/transcribe_speech');

const startTime = Date.now();

try {
  const response = await axios.post(
    'http://89.169.190.223:4000/api/v1/speech/transcribe_speech',
    form,
    {
      headers: form.getHeaders(),
      timeout: 120000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    }
  );
  
  const duration = Date.now() - startTime;
  
  console.log(`\n✅ Response received in ${(duration / 1000).toFixed(2)} seconds`);
  console.log('Status:', response.status);
  console.log('Response type:', typeof response.data);
  console.log('Is array:', Array.isArray(response.data));
  console.log('Segments count:', response.data?.length || 0);
  
  if (response.data && response.data.length > 0) {
    console.log('\n📝 Transcription segments:');
    response.data.forEach((segment, i) => {
      console.log(`  [${i}] ${segment.start?.toFixed(2)}s - ${segment.end?.toFixed(2)}s: "${segment.text}"`);
    });
  } else {
    console.log('\n⚠️ Empty transcription received');
    console.log('Raw response:', JSON.stringify(response.data));
  }
  
} catch (error) {
  const duration = Date.now() - startTime;
  console.error(`\n❌ Error after ${(duration / 1000).toFixed(2)} seconds`);
  console.error('Error:', error.message);
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response data:', error.response.data);
  }
}