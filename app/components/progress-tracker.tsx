"use client";

import { useEffect, useState } from "react";
import type { ProgressEvent } from "@/app/types/video";

interface ProgressTrackerProps {
  jobId: string;
  onComplete: (videoUrl: string) => void;
  onError: (error: string) => void;
}

const progressSteps = [
  { key: 'scenario', label: 'シナリオ生成', range: [0, 25] },
  { key: 'images', label: '画像生成', range: [25, 50] },
  { key: 'audio', label: '音声生成', range: [50, 75] },
  { key: 'assembly', label: '動画組み立て', range: [75, 90] },
  { key: 'bgm', label: 'BGM追加', range: [90, 100] },
];

export function ProgressTracker({ jobId, onComplete, onError }: ProgressTrackerProps) {
  const [progress, setProgress] = useState<ProgressEvent>({
    step: 'scenario',
    status: 'in_progress',
    progress: 0,
    message: 'Initializing...',
  });
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [usePolling, setUsePolling] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    const updateProgress = (data: ProgressEvent) => {
      setProgress(data);

      // Update current step index
      const stepIndex = progressSteps.findIndex((s) => s.key === data.step);
      if (stepIndex !== -1) {
        setCurrentStepIndex(stepIndex);
      }

      // Handle completion
      if (data.step === 'complete') {
        if (data.status === 'completed' && data.data?.videoPath) {
          onComplete(data.data.videoPath);
          cleanup();
        } else if (data.status === 'error') {
          onError(data.message || 'Video generation failed');
          cleanup();
        }
      }
    };

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/video/status/${jobId}`, {
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: ProgressEvent = await response.json();
        updateProgress(data);

        // Stop polling if complete
        if (data.step === 'complete') {
          cleanup();
        }
      } catch (error) {
        console.error('Polling error:', error);
        retryCount++;
        if (retryCount >= maxRetries) {
          onError('進行状況の取得に失敗しました。ページを更新してください。');
          cleanup();
        }
      }
    };

    const startPolling = () => {
      console.log('Switching to polling mode');
      setUsePolling(true);
      pollingInterval = setInterval(pollStatus, 2000);
      pollStatus(); // Initial poll
    };

    const cleanup = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };

    // Try SSE first
    if (!usePolling) {
      try {
        eventSource = new EventSource(`/api/video/status/${jobId}`);

        eventSource.onmessage = (event) => {
          try {
            const data: ProgressEvent = JSON.parse(event.data);
            retryCount = 0; // Reset retry count on success
            updateProgress(data);
          } catch (error) {
            console.error('Failed to parse SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          cleanup();

          // Fallback to polling after SSE failure
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`SSE failed, retry ${retryCount}/${maxRetries}`);
            setTimeout(() => {
              if (!usePolling) {
                startPolling();
              }
            }, 1000);
          } else {
            onError('サーバーとの接続が切断されました。ページを更新してください。');
          }
        };
      } catch (error) {
        console.error('Failed to create EventSource:', error);
        startPolling();
      }
    } else {
      startPolling();
    }

    return cleanup;
  }, [jobId, onComplete, onError, usePolling]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-semibold mb-2">動画生成中</h2>
        <p className="text-gray-600">{progress.message}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-black h-full transition-all duration-500 ease-out"
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      {/* Progress percentage */}
      <div className="text-center">
        <span className="text-4xl font-bold">{progress.progress}%</span>
      </div>

      {/* Step indicators */}
      <div className="space-y-3">
        {progressSteps.map((step, index) => {
          const isCompleted = index < currentStepIndex ||
            (index === currentStepIndex && progress.status === 'completed');
          const isCurrent = index === currentStepIndex && progress.status === 'in_progress';

          return (
            <div
              key={step.key}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isCurrent
                  ? 'bg-gray-100 border-2 border-black'
                  : isCompleted
                  ? 'bg-gray-50'
                  : 'bg-white'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  isCompleted
                    ? 'bg-black text-white'
                    : isCurrent
                    ? 'bg-gray-300 text-gray-700'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${isCurrent ? 'text-black' : 'text-gray-700'}`}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-sm text-gray-500 mt-1">{progress.message}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Animation */}
      <div className="text-center text-gray-400 text-sm">
        <div className="inline-flex items-center space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
