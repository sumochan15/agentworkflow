import fs from 'fs';
import path from 'path';
import type { Scenario } from '@/app/types/video';
import { getRedisClient } from './redis-client';

export interface JobMetadata {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  input: string;
  provider: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  outputPath?: string;
  scenario?: Scenario;
  currentStep?: string;
  currentProgress?: number;
  currentMessage?: string;
}

class VideoJobManager {
  private cleanupTimers = new Map<string, NodeJS.Timeout>();
  private readonly jobsDir = '/tmp/jobs';
  private readonly REDIS_KEY_PREFIX = 'job:';
  private readonly REDIS_TTL = 3600; // 1 hour

  constructor() {
    // Ensure jobs directory exists (fallback for local dev)
    if (!fs.existsSync(this.jobsDir)) {
      fs.mkdirSync(this.jobsDir, { recursive: true });
    }
  }

  /**
   * Get Redis key for job
   */
  private getRedisKey(id: string): string {
    return `${this.REDIS_KEY_PREFIX}${id}`;
  }

  /**
   * Get job metadata file path (fallback)
   */
  private getJobFilePath(id: string): string {
    return path.join(this.jobsDir, `${id}.json`);
  }

  /**
   * Create a new video generation job
   */
  async createJob(input: string, provider: string): Promise<string> {
    const id = this.generateJobId();
    const job: JobMetadata = {
      id,
      status: 'pending',
      input,
      provider,
      createdAt: new Date(),
    };

    const redis = getRedisClient();
    if (redis) {
      // Save to Redis with TTL
      console.log(`📝 Creating job ${id} in Redis`);
      await redis.setex(this.getRedisKey(id), this.REDIS_TTL, JSON.stringify(job));
      console.log(`✅ Job ${id} created successfully in Redis`);

      // Verify it was saved
      const saved = await redis.get(this.getRedisKey(id));
      console.log(`🔍 Verification: job ${id} exists in Redis:`, !!saved);
    } else {
      // Fallback to filesystem
      console.log(`📝 Creating job ${id} in filesystem (Redis not available)`);
      fs.writeFileSync(this.getJobFilePath(id), JSON.stringify(job), 'utf-8');
    }

    return id;
  }

  /**
   * Get job metadata by ID
   */
  async getJob(id: string): Promise<JobMetadata | undefined> {
    try {
      const redis = getRedisClient();
      let data: string | null = null;

      if (redis) {
        // Try Redis first
        console.log(`🔍 Looking for job ${id} in Redis`);
        data = await redis.get(this.getRedisKey(id));
        console.log(`📊 Job ${id} found in Redis:`, !!data);
      } else {
        // Fallback to filesystem
        console.log(`🔍 Looking for job ${id} in filesystem`);
        const filePath = this.getJobFilePath(id);
        if (fs.existsSync(filePath)) {
          data = fs.readFileSync(filePath, 'utf-8');
        }
      }

      if (!data) {
        console.log(`❌ Job ${id} not found`);
        return undefined;
      }

      const job = JSON.parse(data);
      // Convert date strings back to Date objects
      job.createdAt = new Date(job.createdAt);
      if (job.completedAt) {
        job.completedAt = new Date(job.completedAt);
      }
      return job;
    } catch (error) {
      console.error(`Failed to read job ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Update job metadata
   */
  async updateJob(id: string, updates: Partial<JobMetadata>): Promise<void> {
    const job = await this.getJob(id);
    if (job) {
      Object.assign(job, updates);

      const redis = getRedisClient();
      if (redis) {
        // Update in Redis with TTL
        await redis.setex(this.getRedisKey(id), this.REDIS_TTL, JSON.stringify(job));
      } else {
        // Fallback to filesystem
        fs.writeFileSync(this.getJobFilePath(id), JSON.stringify(job), 'utf-8');
      }
    }
  }

  /**
   * Schedule job cleanup after specified minutes
   */
  scheduleCleanup(id: string, deleteAfterMinutes = 60): void {
    // Clear existing timer if any
    const existingTimer = this.cleanupTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule cleanup
    const timer = setTimeout(() => {
      this.cleanupJob(id);
    }, deleteAfterMinutes * 60 * 1000);

    this.cleanupTimers.set(id, timer);
  }

  /**
   * Clean up job and associated files
   */
  private async cleanupJob(id: string): Promise<void> {
    const job = await this.getJob(id);
    if (!job) return;

    // Delete output files
    if (job.outputPath) {
      try {
        const outputDir = path.dirname(job.outputPath);
        if (fs.existsSync(outputDir)) {
          fs.rmSync(outputDir, { recursive: true, force: true });
          console.log(`🗑️  Cleaned up job ${id}: ${outputDir}`);
        }
      } catch (error) {
        console.error(`Failed to cleanup job ${id}:`, error);
      }
    }

    // Delete job metadata
    try {
      const redis = getRedisClient();
      if (redis) {
        await redis.del(this.getRedisKey(id));
      } else {
        const jobFile = this.getJobFilePath(id);
        if (fs.existsSync(jobFile)) {
          fs.unlinkSync(jobFile);
        }
      }
    } catch (error) {
      console.error(`Failed to delete job metadata ${id}:`, error);
    }

    this.cleanupTimers.delete(id);
  }

  /**
   * Generate a unique job ID
   */
  private generateJobId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get all jobs (for debugging)
   */
  async getAllJobs(): Promise<JobMetadata[]> {
    try {
      const redis = getRedisClient();
      if (redis) {
        // Get all job keys from Redis
        const keys = await redis.keys(`${this.REDIS_KEY_PREFIX}*`);
        const jobs: JobMetadata[] = [];
        for (const key of keys) {
          const id = key.replace(this.REDIS_KEY_PREFIX, '');
          const job = await this.getJob(id);
          if (job) {
            jobs.push(job);
          }
        }
        return jobs;
      } else {
        // Fallback to filesystem
        if (!fs.existsSync(this.jobsDir)) {
          return [];
        }
        const files = fs.readdirSync(this.jobsDir);
        const jobs: JobMetadata[] = [];
        for (const file of files) {
          if (file.endsWith('.json')) {
            const id = file.replace('.json', '');
            const job = await this.getJob(id);
            if (job) {
              jobs.push(job);
            }
          }
        }
        return jobs;
      }
    } catch (error) {
      console.error('Failed to get all jobs:', error);
      return [];
    }
  }
}

// Singleton instance
export const jobManager = new VideoJobManager();
