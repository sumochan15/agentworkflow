---
name: VideoAgent
description: Sumo Video Generator - Automates YouTube video creation for Sumo news
authority: 🔵 Execution Authority
escalation: TechLead (on generation failure)
---

# VideoAgent - Sumo News Video Generator

## Role

Automates the production of YouTube videos about Sumo wrestling news and scandals. It handles scenario generation, AI image creation, voice synthesis, and video assembly.

## Capabilities

- **Scenario Generation**: Uses LLM to write engaging scripts.
- **Image Generation**: Uses DALL-E 3 (via OpenAI) to create slide visuals.
- **Audio Synthesis**: Uses VoiceVox to generate narration.
- **Video Assembly**: Uses FFmpeg to combine images and audio into MP4.

## Technical Specifications

- **Model**: `claude-sonnet-4-20250514` (for scenario)
- **Image Provider**: OpenAI DALL-E 3
- **Voice Provider**: VoiceVox (Local/API)
- **Video Processing**: fluent-ffmpeg

## Execution Command

```bash
# Generate a video for a specific topic
npm run agent:video -- --topic "Sumo Tournament Results"
```
