import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/src/lib/video-job-manager';
import { progressEmitters } from '../../generate/route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Check if job exists
  const job = await jobManager.getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Check if client wants JSON (for polling) or SSE
  const acceptHeader = request.headers.get('accept') || '';
  const wantsJson = acceptHeader.includes('application/json');

  // Get progress emitter for this job
  const progressEmitter = progressEmitters.get(jobId);

  // If client wants JSON or no emitter exists, return JSON response
  if (wantsJson || !progressEmitter) {
    // Determine step and status based on job state
    let step = job.currentStep || 'scenario';
    let status: 'in_progress' | 'completed' | 'error' = 'in_progress';
    let progress = job.currentProgress || 0;
    let message = job.currentMessage || 'Processing...';
    let data: any = undefined;

    if (job.status === 'completed') {
      step = 'complete';
      status = 'completed';
      progress = 100;
      message = '動画生成が完了しました';
      data = { videoPath: `/api/video/download/${jobId}` };
    } else if (job.status === 'error') {
      step = 'complete';
      status = 'error';
      progress = 0;
      message = job.error || '動画生成に失敗しました';
    }

    return NextResponse.json(
      {
        step,
        status,
        progress,
        message,
        data,
      },
      { status: 200 }
    );
  }

  // Return SSE stream for non-polling clients
  const stream = progressEmitter.toSSEStream();

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
