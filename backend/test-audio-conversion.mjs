#!/usr/bin/env node

/**
 * test script for audio conversion pipeline
 * validates WebM → WAV conversion functionality
 */

console.log('[TEST] Starting audio conversion pipeline test...');

const testStages = {
  docker_check: false,
  ffmpeg_check: false, 
  file_conversion: false,
  ml_service_integration: false
};

// check if running in docker
async function checkDockerEnvironment() {
  try {
    const fs = await import('fs');
    const isDocker = fs.existsSync('/.dockerenv') || fs.existsSync('/proc/self/cgroup');
    console.log(`[DOCKER] Running in Docker: ${isDocker}`);
    testStages.docker_check = true;
    return isDocker;
  } catch (error) {
    console.error('[DOCKER] Failed to check Docker environment:', error.message);
    return false;
  }
}

// check FFmpeg installation
async function checkFFmpeg() {
  try {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);
      
      let output = '';
      
      ffmpeg.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ffmpeg.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        const hasFFmpeg = code === 0 && output.includes('ffmpeg version');
        console.log(`[FFMPEG] FFmpeg available: ${hasFFmpeg}`);
        
        if (hasFFmpeg) {
          const versionMatch = output.match(/ffmpeg version ([^\s]+)/);
          if (versionMatch) {
            console.log(`[FFMPEG] Version: ${versionMatch[1]}`);
          }
          
          // check supported formats
          const supportsWebm = output.includes('webm') || output.includes('libvpx');
          const supportsWav = output.includes('wav') || output.includes('pcm');
          
          console.log(`[FFMPEG] WebM support: ${supportsWebm}`);
          console.log(`[FFMPEG] WAV support: ${supportsWav}`);
          
          testStages.ffmpeg_check = supportsWebm && supportsWav;
        } else {
          testStages.ffmpeg_check = false;
        }
        
        resolve(hasFFmpeg);
      });
      
      ffmpeg.on('error', (error) => {
        console.error('[FFMPEG] FFmpeg not found:', error.message);
        testStages.ffmpeg_check = false;
        resolve(false);
      });
    });
  } catch (error) {
    console.error('[FFMPEG] Error checking FFmpeg:', error.message);
    testStages.ffmpeg_check = false;
    return false;
  }
}

// create mock WebM file for testing
async function createMockWebMFile() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const mockWebmPath = path.join(uploadsDir, 'test-audio.webm');
    
    // create a minimal WebM file with silence (for testing conversion only)
    // this is a very basic WebM file that FFmpeg can process
    const mockWebmContent = Buffer.from([
      0x1A, 0x45, 0xDF, 0xA3,  // EBML header
      // minimal WebM structure that FFmpeg can handle
    ]);
    
    // alternatively, generate using FFmpeg directly
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      console.log('[MOCK] Generating mock WebM file...');
      
      // generate 5 seconds of silence as WebM
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',                    // use lavfi input
        '-i', 'anullsrc=duration=5',      // 5 seconds of silence
        '-c:a', 'libopus',                // Opus codec (WebM standard)
        '-y',                             // overwrite if exists
        mockWebmPath
      ]);
      
      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(mockWebmPath)) {
          const stats = fs.statSync(mockWebmPath);
          console.log(`[MOCK] Created mock WebM file: ${mockWebmPath} (${stats.size} bytes)`);
          resolve(mockWebmPath);
        } else {
          console.error(`[MOCK] Failed to create mock WebM file (exit code: ${code})`);
          reject(new Error('Mock file generation failed'));
        }
      });
      
      ffmpeg.on('error', (error) => {
        console.error('[MOCK] Error generating mock WebM file:', error.message);
        reject(error);
      });
    });
  } catch (error) {
    console.error('[MOCK] Failed to create mock WebM file:', error.message);
    throw error;
  }
}

// test the audio conversion function
async function testAudioConversion(webmPath) {
  try {
    const fs = await import('fs');
    const { spawn } = await import('child_process');
    const path = await import('path');
    
    const wavPath = webmPath.replace('.webm', '.wav');
    
    console.log(`[CONVERSION] Testing WebM → WAV conversion...`);
    console.log(`[CONVERSION] Input:  ${webmPath}`);
    console.log(`[CONVERSION] Output: ${wavPath}`);
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', webmPath,           // input WebM file
        '-acodec', 'pcm_s16le',   // WAV codec (16-bit PCM)
        '-ar', '16000',           // sample rate 16kHz (optimal for ML service)
        '-ac', '1',               // mono channel
        '-y',                     // overwrite output file if exists
        wavPath                   // output WAV file
      ];
      
      console.log(`[CONVERSION] FFmpeg command: ffmpeg ${args.join(' ')}`);
      
      const ffmpeg = spawn('ffmpeg', args);
      
      let stderrOutput = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          if (fs.existsSync(wavPath)) {
            const inputStats = fs.statSync(webmPath);
            const outputStats = fs.statSync(wavPath);
            
            console.log(`[CONVERSION] ✅ Conversion successful!`);
            console.log(`[CONVERSION] Input size:  ${inputStats.size} bytes`);
            console.log(`[CONVERSION] Output size: ${outputStats.size} bytes`);
            console.log(`[CONVERSION] WAV file created: ${wavPath}`);
            
            testStages.file_conversion = true;
            resolve(wavPath);
          } else {
            console.error(`[CONVERSION] ❌ Conversion reported success but WAV file not found`);
            testStages.file_conversion = false;
            reject(new Error('WAV file not created'));
          }
        } else {
          console.error(`[CONVERSION] ❌ Conversion failed with exit code ${code}`);
          console.error(`[CONVERSION] FFmpeg stderr: ${stderrOutput.slice(-500)}`);
          testStages.file_conversion = false;
          reject(new Error(`FFmpeg conversion failed: ${code}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        console.error('[CONVERSION] FFmpeg process error:', error.message);
        testStages.file_conversion = false;
        reject(error);
      });
    });
  } catch (error) {
    console.error('[CONVERSION] Error in audio conversion test:', error.message);
    testStages.file_conversion = false;
    throw error;
  }
}

// test ML service integration with WAV file
async function testMLServiceIntegration(wavPath) {
  try {
    const fs = await import('fs');
    const FormData = (await import('form-data')).default;
    const axios = (await import('axios')).default;
    
    console.log('[ML-SERVICE] Testing ML service integration with converted WAV file...');
    
    if (!fs.existsSync(wavPath)) {
      throw new Error(`WAV file not found: ${wavPath}`);
    }
    
    const fileStats = fs.statSync(wavPath);
    console.log(`[ML-SERVICE] WAV file size: ${fileStats.size} bytes`);
    
    const formData = new FormData();
    formData.append('audio_file', fs.createReadStream(wavPath));
    
    const ML_SERVICE_URL = process.env.PITCH_ML_SERVICE_URL || 'http://89.169.190.223:4000';
    const endpoint = `${ML_SERVICE_URL}/api/v1/speech/transcribe_speech`;
    
    console.log(`[ML-SERVICE] Sending request to: ${endpoint}`);
    
    try {
      const response = await axios.post(endpoint, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000, // 30 seconds timeout for test
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      
      console.log(`[ML-SERVICE] ✅ Response received!`);
      console.log(`[ML-SERVICE] Status: ${response.status}`);
      console.log(`[ML-SERVICE] Response type: ${typeof response.data}`);
      console.log(`[ML-SERVICE] Response preview: ${JSON.stringify(response.data).substring(0, 200)}...`);
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log(`[ML-SERVICE] ✅ Transcription segments received: ${response.data.length}`);
        testStages.ml_service_integration = true;
      } else {
        console.log(`[ML-SERVICE] ⚠️  Empty transcription data (normal for silence)`);
        testStages.ml_service_integration = true; // still consider success for test file
      }
      
      return response.data;
      
    } catch (error) {
      if (error.response) {
        console.error(`[ML-SERVICE] ❌ ML service error: ${error.response.status} ${error.response.statusText}`);
        console.error(`[ML-SERVICE] Response: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error(`[ML-SERVICE] ❌ Network error: ${error.message}`);
      } else {
        console.error(`[ML-SERVICE] ❌ Request error: ${error.message}`);
      }
      
      testStages.ml_service_integration = false;
      throw error;
    }
    
  } catch (error) {
    console.error('[ML-SERVICE] Error in ML service integration test:', error.message);
    testStages.ml_service_integration = false;
    throw error;
  }
}

// cleanup test files
async function cleanup(webmPath, wavPath) {
  try {
    const fs = await import('fs');
    
    if (webmPath && fs.existsSync(webmPath)) {
      fs.unlinkSync(webmPath);
      console.log(`[CLEANUP] Removed: ${webmPath}`);
    }
    
    if (wavPath && fs.existsSync(wavPath)) {
      fs.unlinkSync(wavPath);
      console.log(`[CLEANUP] Removed: ${wavPath}`);
    }
  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error.message);
  }
}

// main test execution
async function runTests() {
  console.log('\n=== AUDIO CONVERSION PIPELINE TEST ===\n');
  
  let webmPath, wavPath;
  
  try {
    // stage 1: check environment
    console.log('--- Stage 1: Environment Check ---');
    await checkDockerEnvironment();
    await checkFFmpeg();
    
    if (!testStages.ffmpeg_check) {
      throw new Error('FFmpeg not available or missing WebM/WAV support');
    }
    
    // stage 2: create test file and convert
    console.log('\n--- Stage 2: Audio Conversion Test ---');
    webmPath = await createMockWebMFile();
    wavPath = await testAudioConversion(webmPath);
    
    // stage 3: test ML service integration
    console.log('\n--- Stage 3: ML Service Integration Test ---');
    await testMLServiceIntegration(wavPath);
    
  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}`);
  } finally {
    // cleanup
    console.log('\n--- Cleanup ---');
    if (webmPath && wavPath) {
      await cleanup(webmPath, wavPath);
    }
    
    // final report
    console.log('\n=== TEST RESULTS ===');
    console.log(`Docker Environment:     ${testStages.docker_check ? '✅' : '❌'}`);
    console.log(`FFmpeg Available:       ${testStages.ffmpeg_check ? '✅' : '❌'}`);
    console.log(`File Conversion:        ${testStages.file_conversion ? '✅' : '❌'}`);
    console.log(`ML Service Integration: ${testStages.ml_service_integration ? '✅' : '❌'}`);
    
    const allPassed = Object.values(testStages).every(stage => stage === true);
    
    console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPassed) {
      console.log('\n🚀 Audio conversion pipeline is ready for production!');
      console.log('Frontend WebM recordings will be automatically converted to WAV for ML processing.');
    } else {
      console.log('\n⚠️  Audio conversion pipeline needs attention before production use.');
    }
    
    process.exit(allPassed ? 0 : 1);
  }
}

// run tests
runTests().catch((error) => {
  console.error('\n💥 FATAL ERROR:', error.message);
  process.exit(1);
});