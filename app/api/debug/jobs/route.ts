import { NextResponse } from 'next/server';
import { jobManager } from '@/src/lib/video-job-manager';

export async function GET() {
  try {
    const jobs = await jobManager.getAllJobs();

    // Sort by creation date, newest first
    const sortedJobs = jobs.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      total: jobs.length,
      jobs: sortedJobs.map(job => ({
        jobId: job.id,
        status: job.status,
        currentStep: job.currentStep,
        currentProgress: job.currentProgress,
        currentMessage: job.currentMessage,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        hasOutput: !!job.outputPath,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
