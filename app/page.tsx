"use client";

import { useState } from "react";
import { VideoForm, type VideoFormData } from "@/app/components/video-form";
import { ScenarioEditor } from "@/app/components/scenario-editor";
import { ProgressTracker } from "@/app/components/progress-tracker";
import { Button } from "@/app/components/ui/button";
import type { Scenario } from "@/app/types/video";

type AppStep = 'input' | 'scenario' | 'processing' | 'complete';

export default function Home() {
  const [step, setStep] = useState<AppStep>('input');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [formData, setFormData] = useState<VideoFormData | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (data: VideoFormData) => {
    setFormData(data);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scenario/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: data.input,
          apiKeys: {
            openai: data.apiKeys.openai,
          },
        }),
      });

      if (!response.ok) {
        let errorMessage = 'シナリオの生成に失敗しました';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use response status text
          errorMessage = `${errorMessage} (${response.status} ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setScenario(result.scenario);
      setStep('scenario');
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
      console.error('Scenario preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioApprove = async (editedScenario: Scenario) => {
    if (!formData) return;

    setLoading(true);
    setError(null);

    try {
      // Create FormData for file uploads
      const formDataToSend = new FormData();
      formDataToSend.append('input', formData.input);
      formDataToSend.append('provider', formData.provider);
      if (formData.voiceId) {
        formDataToSend.append('voiceId', formData.voiceId);
      }
      formDataToSend.append('apiKeys', JSON.stringify(formData.apiKeys));
      formDataToSend.append('scenario', JSON.stringify(editedScenario));

      if (formData.referenceImage) {
        formDataToSend.append('referenceImage', formData.referenceImage);
      }
      if (formData.bgm) {
        formDataToSend.append('bgm', formData.bgm);
      }

      // Start video generation
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        let errorMessage = '動画生成の開始に失敗しました';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use response status text
          errorMessage = `${errorMessage} (${response.status} ${response.statusText})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setJobId(result.jobId);
      setStep('processing');
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
      console.error('Video generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoComplete = (url: string) => {
    setVideoUrl(url);
    setStep('complete');
  };

  const handleVideoError = (errorMessage: string) => {
    setError(errorMessage);
    setStep('input');
  };

  const handleScenarioCancel = () => {
    setStep('input');
    setScenario(null);
    setError(null);
  };

  const handleStartOver = () => {
    setStep('input');
    setScenario(null);
    setFormData(null);
    setJobId(null);
    setVideoUrl(null);
    setError(null);
  };

  return (
    <div className="w-full">
      <header className="text-center mb-8 lg:mb-12">
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black mb-4 tracking-tighter leading-none">
          <span className="gradient-text">AI Jonbin</span>
          <br />
          <span className="text-foreground font-heading">Movie Maker</span>
        </h1>
      </header>

      {error && (
        <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 border-l-4 border-destructive text-destructive px-6 py-4 rounded-r-xl mb-6 shadow-lg backdrop-blur-sm animate-slide-in">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold mb-1">エラーが発生しました</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input Form */}
        <div className="glass rounded-3xl shadow-2xl border border-white/20 overflow-hidden backdrop-blur-xl h-fit sticky top-6">
          <div className="p-6 sm:p-8">
            <VideoForm onSubmit={handleFormSubmit} disabled={loading || step !== 'input'} />
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="glass rounded-3xl shadow-2xl border border-white/20 overflow-hidden backdrop-blur-xl min-h-[500px]">
          <div className="p-6 sm:p-8">
            {step === 'input' && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-heading text-xl font-bold mb-2 text-foreground">準備完了</h3>
                <p className="font-sans text-muted-foreground">
                  左側のフォームに情報を入力して<br />シナリオ生成を開始してください
                </p>
              </div>
            )}

            {step === 'scenario' && scenario && (
              <ScenarioEditor
                scenario={scenario}
                onApprove={handleScenarioApprove}
                onCancel={handleScenarioCancel}
                disabled={loading}
              />
            )}

            {step === 'processing' && jobId && (
              <ProgressTracker
                jobId={jobId}
                onComplete={handleVideoComplete}
                onError={handleVideoError}
              />
            )}

            {step === 'complete' && videoUrl && (
              <div className="text-center py-8 space-y-6 animate-fade-in">
                <div className="inline-flex items-center justify-center p-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl mb-4 shadow-xl shadow-green-500/30 animate-bounce">
                  <svg
                    className="w-16 h-16 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-3xl font-bold mb-4 gradient-text">動画完成！</h2>
                  <p className="font-sans text-muted-foreground text-base mb-6">
                    動画の生成が完了しました。<br />ダウンロードしてご利用ください。
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  <Button size="lg" className="w-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all" asChild>
                    <a href={videoUrl} download className="inline-flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      動画をダウンロード
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" className="w-full border-2 hover:bg-primary/5" onClick={handleStartOver}>
                    新しい動画を作成
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-8 lg:mt-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-border text-sm text-muted-foreground">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          Powered by Next.js 15 + OpenAI + Google AI
        </div>
      </footer>
    </div>
  );
}
