/**
 * Shared type definitions for video generation
 */

export interface Scene {
  text: string;
  imagePrompt: string;
}

export interface Scenario {
  title: string;
  scenes: Scene[];
}

export interface VideoGenerationRequest {
  input: string;
  provider: 'elevenlabs' | 'voicevox';
  voiceId?: string;
  apiKeys: {
    openai: string;
    google: string;
    elevenlabs?: string;
  };
}

export interface ProgressEvent {
  step: 'scenario' | 'images' | 'audio' | 'assembly' | 'bgm' | 'complete';
  status: 'in_progress' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  data?: any;
}

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
}
