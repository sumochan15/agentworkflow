"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  loadApiKeys,
  saveApiKeys,
  clearApiKeys,
  validateApiKey,
  type StoredApiKeys,
} from "@/app/lib/storage";

interface ApiKeyManagerProps {
  onKeysUpdated?: (keys: StoredApiKeys) => void;
}

export function ApiKeyManager({ onKeysUpdated }: ApiKeyManagerProps) {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState<StoredApiKeys>({});
  const [showKeys, setShowKeys] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof StoredApiKeys, string>>>({});

  useEffect(() => {
    const stored = loadApiKeys();
    setKeys(stored);
  }, []);

  const handleSave = () => {
    const newErrors: Partial<Record<keyof StoredApiKeys, string>> = {};

    // Validate required keys
    if (keys.openai && !validateApiKey(keys.openai, 'openai')) {
      newErrors.openai = 'Invalid OpenAI API key format';
    }
    if (keys.google && !validateApiKey(keys.google, 'google')) {
      newErrors.google = 'Invalid Google API key format';
    }
    if (keys.elevenlabs && !validateApiKey(keys.elevenlabs, 'elevenlabs')) {
      newErrors.elevenlabs = 'Invalid ElevenLabs API key format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    saveApiKeys(keys);
    onKeysUpdated?.(keys);
    setOpen(false);
    setErrors({});
  };

  const handleClear = () => {
    if (confirm('本当にすべてのAPIキーを削除しますか？')) {
      clearApiKeys();
      setKeys({});
      onKeysUpdated?.({});
    }
  };

  const handleChange = (field: keyof StoredApiKeys, value: string) => {
    setKeys((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">API Keys 管理</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>API Keys 設定</DialogTitle>
          <DialogDescription>
            APIキーはブラウザのLocalStorageに保存されます。サーバーには送信されません。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="openai">
              OpenAI API Key <span className="text-red-500">*</span>
            </Label>
            <Input
              id="openai"
              type={showKeys ? "text" : "password"}
              placeholder="sk-..."
              value={keys.openai || ""}
              onChange={(e) => handleChange('openai', e.target.value)}
            />
            {errors.openai && (
              <p className="text-sm text-red-500">{errors.openai}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="google">
              Google API Key <span className="text-red-500">*</span>
            </Label>
            <Input
              id="google"
              type={showKeys ? "text" : "password"}
              placeholder="AIza..."
              value={keys.google || ""}
              onChange={(e) => handleChange('google', e.target.value)}
            />
            {errors.google && (
              <p className="text-sm text-red-500">{errors.google}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="elevenlabs">
              ElevenLabs API Key (オプション)
            </Label>
            <Input
              id="elevenlabs"
              type={showKeys ? "text" : "password"}
              placeholder="sk_..."
              value={keys.elevenlabs || ""}
              onChange={(e) => handleChange('elevenlabs', e.target.value)}
            />
            {errors.elevenlabs && (
              <p className="text-sm text-red-500">{errors.elevenlabs}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="voiceId">
              Voice ID (オプション)
            </Label>
            <Input
              id="voiceId"
              type="text"
              placeholder="Your voice ID..."
              value={keys.voiceId || ""}
              onChange={(e) => handleChange('voiceId', e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showKeys"
              checked={showKeys}
              onChange={(e) => setShowKeys(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="showKeys" className="cursor-pointer">
              APIキーを表示する
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClear} className="mr-auto">
            すべてクリア
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button type="submit" onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
