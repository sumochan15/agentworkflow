import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/src/lib/video-job-manager';
import fs from 'fs';
import path from 'path';

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

  // Check if job is completed
  if (job.status !== 'completed') {
    return NextResponse.json(
      { error: 'Video is not ready yet' },
      { status: 400 }
    );
  }

  // Check if output file exists
  if (!job.outputPath || !fs.existsSync(job.outputPath)) {
    return NextResponse.json(
      { error: 'Video file not found' },
      { status: 404 }
    );
  }

  try {
    // Read video file
    const videoBuffer = fs.readFileSync(job.outputPath);

    // Generate filename
    const filename = `jonbin-video-${jobId}.mp4`;

    // Return video file with appropriate headers
    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': videoBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error(`Failed to read video file for job ${jobId}:`, error);
    return NextResponse.json(
      { error: 'Failed to read video file' },
      { status: 500 }
    );
  }
}
