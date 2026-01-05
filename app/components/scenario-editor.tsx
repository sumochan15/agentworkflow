"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import type { Scenario } from "@/app/types/video";

interface ScenarioEditorProps {
  scenario: Scenario;
  onApprove: (editedScenario: Scenario) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ScenarioEditor({
  scenario,
  onApprove,
  onCancel,
  disabled,
}: ScenarioEditorProps) {
  const [editedScenario, setEditedScenario] = useState<Scenario>(scenario);

  const handleSceneTextChange = (index: number, text: string) => {
    setEditedScenario((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene, i) =>
        i === index ? { ...scene, text } : scene
      ),
    }));
  };

  const handleSceneImagePromptChange = (index: number, imagePrompt: string) => {
    setEditedScenario((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene, i) =>
        i === index ? { ...scene, imagePrompt } : scene
      ),
    }));
  };

  const handleTitleChange = (title: string) => {
    setEditedScenario((prev) => ({ ...prev, title }));
  };

  const handleRemoveScene = (index: number) => {
    setEditedScenario((prev) => ({
      ...prev,
      scenes: prev.scenes.filter((_, i) => i !== index),
    }));
  };

  const handleAddScene = () => {
    setEditedScenario((prev) => ({
      ...prev,
      scenes: [
        ...prev.scenes,
        {
          text: "",
          imagePrompt: "",
        },
      ],
    }));
  };

  return (
    <div className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      <div>
        <h2 className="font-heading text-xl font-bold mb-2 text-foreground flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          シナリオプレビュー
        </h2>
        <p className="font-sans text-muted-foreground text-sm">
          生成されたシナリオを確認・編集できます
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-xs">タイトル</Label>
        <input
          id="title"
          type="text"
          value={editedScenario.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={disabled}
          className="flex h-10 w-full rounded-lg border-2 border-input bg-input/50 backdrop-blur-sm px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-xs">シーン ({editedScenario.scenes.length}個)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddScene}
            disabled={disabled}
            className="h-8 px-3 text-xs"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            追加
          </Button>
        </div>

        <div className="space-y-3">
          {editedScenario.scenes.map((scene, index) => (
            <div
              key={index}
              className="border-2 border-border/50 rounded-xl p-3 space-y-2.5 bg-card/30 backdrop-blur-sm hover:border-primary/30 transition-all"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5">
                  <span className="font-display flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                    {index + 1}
                  </span>
                  シーン {index + 1}
                </h3>
                {editedScenario.scenes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveScene(index)}
                    disabled={disabled}
                    className="h-7 px-2 text-xs hover:text-destructive"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`scene-text-${index}`} className="text-xs">ナレーション</Label>
                <Textarea
                  id={`scene-text-${index}`}
                  value={scene.text}
                  onChange={(e) => handleSceneTextChange(index, e.target.value)}
                  disabled={disabled}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`scene-image-${index}`} className="text-xs flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  画像プロンプト
                </Label>
                <Textarea
                  id={`scene-image-${index}`}
                  value={scene.imagePrompt}
                  onChange={(e) =>
                    handleSceneImagePromptChange(index, e.target.value)
                  }
                  disabled={disabled}
                  rows={2}
                  className="text-xs font-mono"
                  style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-3 sticky bottom-0 bg-card/95 backdrop-blur-lg -mx-2 px-2 py-3 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={disabled}
          className="flex-1"
        >
          戻る
        </Button>
        <Button
          type="button"
          onClick={() => onApprove(editedScenario)}
          disabled={disabled}
          className="flex-1"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          動画生成開始
        </Button>
      </div>
    </div>
  );
}
