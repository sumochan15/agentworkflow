import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/src/lib/video-job-manager';
import { ProgressEmitter } from '@/src/lib/progress-emitter';
import { VideoAgent } from '@/src/agents/video-agent';
import type { Scenario } from '@/app/types/video';
import path from 'path';
import fs from 'fs';

// Store progress emitters for each job
const progressEmitters = new Map<string, ProgressEmitter>();

// Configure body size limit for API route
export const runtime = 'nodejs';
export const maxDuration = 800;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form fields
    const input = formData.get('input') as string;
    const provider = formData.get('provider') as 'elevenlabs' | 'voicevox';
    const voiceId = formData.get('voiceId') as string | null;
    const apiKeysString = formData.get('apiKeys') as string;
    const scenarioString = formData.get('scenario') as string | null;

    // Parse API keys
    const apiKeys = JSON.parse(apiKeysString);

    // Parse scenario if provided
    const scenario: Scenario | undefined = scenarioString
      ? JSON.parse(scenarioString)
      : undefined;

    // Validate required fields
    if (!input || !provider || !apiKeys.openai || !apiKeys.google) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create job
    const jobId = await jobManager.createJob(input, provider);

    // Save scenario to job if provided
    if (scenario) {
      await jobManager.updateJob(jobId, { scenario });
    }

    // Create progress emitter
    const progressEmitter = new ProgressEmitter(jobId);
    progressEmitters.set(jobId, progressEmitter);

    // Handle file uploads
    let referenceImagePath: string | undefined;
    let bgmPath: string | undefined;

    const referenceImage = formData.get('referenceImage') as File | null;
    if (referenceImage && referenceImage.size > 0) {
      const tmpDir = `/tmp/jobs/${jobId}`;
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      referenceImagePath = path.join(tmpDir, 'reference.png');
      const buffer = Buffer.from(await referenceImage.arrayBuffer());
      fs.writeFileSync(referenceImagePath, buffer);
    }

    const bgmFile = formData.get('bgm') as File | null;
    if (bgmFile && bgmFile.size > 0) {
      const tmpDir = `/tmp/jobs/${jobId}`;
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      bgmPath = path.join(tmpDir, 'bgm.mp3');
      const buffer = Buffer.from(await bgmFile.arrayBuffer());
      fs.writeFileSync(bgmPath, buffer);
    }

    // Start video generation in background (don't await)
    generateVideo({
      jobId,
      input,
      provider,
      voiceId: voiceId || undefined,
      apiKeys,
      scenario,
      referenceImagePath,
      bgmPath,
      progressEmitter,
    }).catch(async (error) => {
      console.error(`Job ${jobId} failed:`, error);
      await jobManager.updateJob(jobId, {
        status: 'error',
        error: error.message || 'Video generation failed',
      });
      progressEmitter.emitProgress({
        step: 'complete',
        status: 'error',
        progress: 0,
        message: error.message || 'Video generation failed',
      });
    });

    return NextResponse.json({ jobId, status: 'pending' });
  } catch (error: any) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create video generation job' },
      { status: 500 }
    );
  }
}

async function generateVideo(params: {
  jobId: string;
  input: string;
  provider: 'elevenlabs' | 'voicevox';
  voiceId?: string;
  apiKeys: any;
  scenario?: Scenario;
  referenceImagePath?: string;
  bgmPath?: string;
  progressEmitter: ProgressEmitter;
}) {
  const {
    jobId,
    input,
    provider,
    voiceId,
    apiKeys,
    scenario,
    referenceImagePath,
    bgmPath,
    progressEmitter,
  } = params;

  // Update job status
  await jobManager.updateJob(jobId, { status: 'processing' });

  // Create VideoAgent with progress callback
  const agent = new VideoAgent({
    apiKeys,
    voiceId,
    provider,
    outputDir: `/tmp/jobs/${jobId}`,
    referenceImagePath,
    bgmPath,
    progressCallback: (event) => {
      // Emit to SSE stream
      progressEmitter.emitProgress(event);

      // Also update job metadata for polling clients
      jobManager.updateJob(jobId, {
        currentStep: event.step,
        currentProgress: event.progress,
        currentMessage: event.message,
      }).catch(err => console.error('Failed to update job metadata:', err));
    },
  });

  // Run video generation
  const videoPath = await agent.run(input, scenario);

  // Update job with completed status
  await jobManager.updateJob(jobId, {
    status: 'completed',
    completedAt: new Date(),
    outputPath: videoPath,
  });

  // Schedule cleanup after 60 minutes
  jobManager.scheduleCleanup(jobId, 60);
}

export { progressEmitters };
