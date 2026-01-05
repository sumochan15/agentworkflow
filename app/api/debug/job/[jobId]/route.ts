import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/src/lib/video-job-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const job = await jobManager.getJob(jobId);

    if (!job) {
      return NextResponse.json({
        error: 'Job not found',
        jobId,
      }, { status: 404 });
    }

    return NextResponse.json({
      jobId,
      status: job.status,
      currentStep: job.currentStep,
      currentProgress: job.currentProgress,
      currentMessage: job.currentMessage,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      hasOutput: !!job.outputPath,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
