"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { ApiKeyManager } from "./api-key-manager";
import { loadApiKeys, type StoredApiKeys } from "@/app/lib/storage";
import imageCompression from 'browser-image-compression';

interface VideoFormProps {
  onSubmit: (data: VideoFormData) => void;
  disabled?: boolean;
}

export interface VideoFormData {
  input: string;
  provider: 'elevenlabs' | 'voicevox';
  voiceId?: string;
  apiKeys: StoredApiKeys;
  referenceImage?: File;
  bgm?: File;
}

export function VideoForm({ onSubmit, disabled }: VideoFormProps) {
  const [apiKeys, setApiKeys] = useState<StoredApiKeys>({});
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<'elevenlabs' | 'voicevox'>('elevenlabs');
  const [voiceId, setVoiceId] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | undefined>();
  const [bgm, setBgm] = useState<File | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const keys = loadApiKeys();
    setApiKeys(keys);
    if (keys.voiceId) {
      setVoiceId(keys.voiceId);
    }
  }, []);

  const handleKeysUpdated = (keys: StoredApiKeys) => {
    setApiKeys(keys);
    if (keys.voiceId) {
      setVoiceId(keys.voiceId);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!input.trim()) {
      newErrors.input = "URL または テキストを入力してください";
    }

    if (!apiKeys.openai) {
      newErrors.apiKeys = "OpenAI API Keyが設定されていません";
    }

    if (!apiKeys.google) {
      newErrors.apiKeys = "Google API Keyが設定されていません";
    }

    if (provider === 'elevenlabs' && !apiKeys.elevenlabs) {
      newErrors.provider = "ElevenLabs API Keyが設定されていません";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit({
      input,
      provider,
      voiceId: voiceId || undefined,
      apiKeys,
      referenceImage,
      bgm,
    });
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'bgm'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size (Vercel limit: 4.5MB total)
    if (type === 'image') {
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({ ...prev, referenceImage: '画像ファイルを選択してください' }));
        return;
      }

      try {
        let processedFile = file;

        // Auto-compress if file is larger than 2MB
        if (file.size > 2 * 1024 * 1024) {
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: file.type as any,
          };

          processedFile = await imageCompression(file, options);
          console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
        }

        // Final size check
        if (processedFile.size > 2 * 1024 * 1024) {
          setErrors((prev) => ({ ...prev, referenceImage: 'ファイルサイズは2MB以下にしてください（圧縮後も超過）' }));
          return;
        }

        setReferenceImage(processedFile);
        setErrors((prev) => {
          const { referenceImage, ...rest } = prev;
          return rest;
        });
      } catch (error) {
        console.error('Image compression error:', error);
        setErrors((prev) => ({ ...prev, referenceImage: '画像の処理中にエラーが発生しました' }));
      }
    } else {
      if (!file.type.startsWith('audio/')) {
        setErrors((prev) => ({ ...prev, bgm: '音声ファイルを選択してください' }));
        return;
      }
      // Reduced to 2MB to stay within Vercel's 4.5MB limit
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, bgm: 'ファイルサイズは2MB以下にしてください（Vercel制限）' }));
        return;
      }
      setBgm(file);
      setErrors((prev) => {
        const { bgm, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading text-2xl font-bold">動画作成</h2>
        <ApiKeyManager onKeysUpdated={handleKeysUpdated} />
      </div>

      {errors.apiKeys && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.apiKeys}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="input">
          記事のURL または テキスト <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="input"
          placeholder="https://example.com/article または 記事のテキストを貼り付け..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setErrors((prev) => {
              const { input, ...rest } = prev;
              return rest;
            });
          }}
          rows={4}
          disabled={disabled}
          className={errors.input ? 'border-red-500' : ''}
        />
        {errors.input && <p className="text-sm text-red-500">{errors.input}</p>}
      </div>

      <div className="space-y-2">
        <Label>音声プロバイダー</Label>
        <div className="flex gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="provider"
              value="elevenlabs"
              checked={provider === 'elevenlabs'}
              onChange={(e) => setProvider(e.target.value as 'elevenlabs')}
              disabled={disabled}
              className="h-4 w-4"
            />
            <span>ElevenLabs (高品質)</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="provider"
              value="voicevox"
              checked={provider === 'voicevox'}
              onChange={(e) => setProvider(e.target.value as 'voicevox')}
              disabled={disabled}
              className="h-4 w-4"
            />
            <span>VoiceVox (無料)</span>
          </label>
        </div>
        {errors.provider && <p className="text-sm text-red-500">{errors.provider}</p>}
      </div>

      {provider === 'elevenlabs' && (
        <div className="space-y-2">
          <Label htmlFor="voiceId">Voice ID (オプション)</Label>
          <Input
            id="voiceId"
            type="text"
            placeholder="ElevenLabs Voice ID..."
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="referenceImage" className="flex items-center justify-between">
          <span>レファレンス画像 (オプション)</span>
          <span className="text-xs text-muted-foreground font-normal">最大2MB</span>
        </Label>
        <Input
          id="referenceImage"
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e, 'image')}
          disabled={disabled}
        />
        {referenceImage && (
          <p className="text-sm text-muted-foreground">
            選択中: {referenceImage.name} ({(referenceImage.size / 1024).toFixed(1)} KB)
          </p>
        )}
        {errors.referenceImage && (
          <p className="text-sm text-red-500">{errors.referenceImage}</p>
        )}
        <p className="text-xs text-muted-foreground/70">
          💡 2MB以上は自動圧縮されます（Vercel制限: 4.5MB）
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bgm" className="flex items-center justify-between">
          <span>BGM (オプション)</span>
          <span className="text-xs text-muted-foreground font-normal">最大2MB</span>
        </Label>
        <Input
          id="bgm"
          type="file"
          accept="audio/*"
          onChange={(e) => handleFileChange(e, 'bgm')}
          disabled={disabled}
        />
        {bgm && (
          <p className="text-sm text-muted-foreground">
            選択中: {bgm.name} ({(bgm.size / 1024).toFixed(1)} KB)
          </p>
        )}
        {errors.bgm && <p className="text-sm text-red-500">{errors.bgm}</p>}
        <p className="text-xs text-muted-foreground/70">
          💡 2MB以上は自動圧縮されます（Vercel制限: 4.5MB）
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={disabled} size="lg">
        {disabled ? '処理中...' : 'シナリオを生成'}
      </Button>
    </form>
  );
}
