#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node check-wav.mjs <wav-file-path>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
console.log('\n=== WAV File Analysis ===');
console.log(`File: ${path.basename(filePath)}`);
console.log(`Size: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(2)} KB)`);

// Check RIFF header
const riff = buffer.toString('ascii', 0, 4);
const wave = buffer.toString('ascii', 8, 12);
console.log(`\nHeader: ${riff} / ${wave}`);

if (riff !== 'RIFF' || wave !== 'WAVE') {
  console.error('❌ Not a valid WAV file!');
  process.exit(1);
}

// Parse fmt chunk
const fmtPos = buffer.indexOf(Buffer.from('fmt '));
if (fmtPos !== -1) {
  const audioFormat = buffer.readUInt16LE(fmtPos + 8);
  const numChannels = buffer.readUInt16LE(fmtPos + 10);
  const sampleRate = buffer.readUInt32LE(fmtPos + 12);
  const byteRate = buffer.readUInt32LE(fmtPos + 16);
  const blockAlign = buffer.readUInt16LE(fmtPos + 20);
  const bitsPerSample = buffer.readUInt16LE(fmtPos + 22);
  
  console.log('\n=== Audio Format ===');
  console.log(`Format: ${audioFormat === 1 ? 'PCM' : `Unknown (${audioFormat})`}`);
  console.log(`Channels: ${numChannels} ${numChannels === 1 ? '(Mono)' : '(Stereo)'}`);
  console.log(`Sample Rate: ${sampleRate} Hz`);
  console.log(`Byte Rate: ${byteRate} bytes/sec`);
  console.log(`Bits per Sample: ${bitsPerSample}`);
  console.log(`Block Align: ${blockAlign}`);
}

// Find data chunk
const dataPos = buffer.indexOf(Buffer.from('data'));
if (dataPos !== -1) {
  const dataSize = buffer.readUInt32LE(dataPos + 4);
  console.log(`\n=== Data Chunk ===`);
  console.log(`Data size: ${dataSize} bytes`);
  console.log(`Duration: ~${(dataSize / 88200).toFixed(2)} seconds (at 44100Hz mono)`);
  
  // Check if audio has any non-zero samples
  let hasSound = false;
  let maxSample = 0;
  const startCheck = dataPos + 8;
  const endCheck = Math.min(startCheck + dataSize, buffer.length);
  
  for (let i = startCheck; i < endCheck; i += 2) {
    const sample = Math.abs(buffer.readInt16LE(i));
    if (sample > 100) hasSound = true; // threshold for silence
    if (sample > maxSample) maxSample = sample;
  }
  
  console.log(`\n=== Audio Content ===`);
  console.log(`Has sound: ${hasSound ? '✅ Yes' : '❌ No (silent)'}`);
  console.log(`Max sample value: ${maxSample} / 32768`);
  console.log(`Volume level: ${((maxSample / 32768) * 100).toFixed(2)}%`);
}

console.log('\n========================\n');