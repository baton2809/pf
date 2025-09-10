#!/usr/bin/env node

// background processing test for audioProcessor.startProcessing()

import { randomUUID } from 'crypto';
import { readdir } from 'fs/promises';

async function testBackgroundProcessing() {
    const { audioProcessor } = await import('./dist/services/audio-processor.js');
    const { database } = await import('./dist/services/database.js');
    
    const testSessionId = randomUUID();
    const startTime = Date.now();
    
    console.log('[BACKGROUND-TEST] background processing test started');
    console.log(`[BACKGROUND-TEST] sessionId: ${testSessionId}`);
    console.log(`[BACKGROUND-TEST] timestamp: ${new Date().toISOString()}`);
    console.log(`[BACKGROUND-TEST] processId: ${process.pid}`);
    
    try {
        // find first audio file in uploads
        const uploadFiles = await readdir('/app/uploads');
        const audioFile = uploadFiles.find(file => file.endsWith('.wav'));
        
        if (!audioFile) {
            throw new Error('no audio files found in uploads directory');
        }
        
        const testFilePath = `/app/uploads/${audioFile}`;
        console.log(`[BACKGROUND-TEST] using audio file: ${audioFile}`);
        
        // initialize services
        console.log('[BACKGROUND-TEST] initializing services');
        await database.init();
        console.log('[BACKGROUND-TEST] database connected');
        
        // create test session
        await database.createSession(
            testSessionId,
            audioFile,
            testFilePath,
            'pitch',
            'Background Processing Test',
            'test-user-bg',
            0
        );
        console.log('[BACKGROUND-TEST] test session created');
        
        // setup progress listener
        let progressCount = 0;
        const progressListener = (sessionId, progress) => {
            progressCount++;
            console.log(`[BACKGROUND-TEST] progress update #${progressCount}: ${progress.stage} - ${progress.progress}%`);
            
            if (progress.error) {
                console.error(`[BACKGROUND-TEST] progress error:`, progress.error);
            }
        };
        
        audioProcessor.addProgressListener(progressListener);
        console.log('[BACKGROUND-TEST] progress listener attached');
        
        // start background processing
        console.log('[BACKGROUND-TEST] starting background processing');
        console.log('[BACKGROUND-TEST] WARNING: processing will take approximately 90 seconds');
        
        audioProcessor.startProcessing(testSessionId, testFilePath);
        console.log('[BACKGROUND-TEST] processing initiated - monitoring started');
        
        // monitor processing completion
        let completed = false;
        let attempts = 0;
        const maxAttempts = 120;
        
        while (!completed && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
            
            try {
                const session = await database.getSession(testSessionId);
                const status = session?.status || 'unknown';
                
                // log status every 20 seconds
                if (attempts % 4 === 0 || status !== 'processing') {
                    console.log(`[BACKGROUND-TEST] status check #${attempts}: ${status} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
                }
                
                if (status === 'completed') {
                    completed = true;
                    const totalTime = Date.now() - startTime;
                    
                    console.log('[BACKGROUND-TEST] processing completed successfully!');
                    console.log(`[BACKGROUND-TEST] total time: ${Math.round(totalTime / 1000)}s`);
                    console.log(`[BACKGROUND-TEST] audio duration: ${session.duration}s`);
                    console.log(`[BACKGROUND-TEST] progress updates received: ${progressCount}`);
                    
                    if (session.mlResults) {
                        const results = session.mlResults;
                        console.log(`[BACKGROUND-TEST] ML results: ${results.speech_segments?.length || 0} speech segments, ${results.questions?.length || 0} questions generated`);
                    }
                    
                } else if (status === 'failed') {
                    console.error('[BACKGROUND-TEST] processing failed');
                    completed = true;
                }
                
            } catch (error) {
                console.log(`[BACKGROUND-TEST] status check error (attempt ${attempts}): ${error.message}`);
            }
        }
        
        if (!completed) {
            console.error('[BACKGROUND-TEST] TIMEOUT: processing exceeded 10 minutes');
        }
        
        // cleanup
        audioProcessor.removeProgressListener(progressListener);
        console.log('[BACKGROUND-TEST] cleanup completed');
        
    } catch (error) {
        console.error('[BACKGROUND-TEST] test failed:', error.message);
        if (error.stack) {
            console.error('[BACKGROUND-TEST] stack:', error.stack.split('\n').slice(0, 3).join('\n'));
        }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`[BACKGROUND-TEST] test finished in ${Math.round(totalTime / 1000)}s (pid: ${process.pid})`);
    
    process.exit(0);
}

testBackgroundProcessing().catch((error) => {
    console.error('fatal error:', error.message);
    process.exit(1);
});