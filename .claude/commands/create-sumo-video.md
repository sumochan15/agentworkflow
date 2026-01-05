---
description: Create a Sumo news video from a topic
usage: /create-sumo-video <topic>
---

# /create-sumo-video

Generates a YouTube-style video summary for the given Sumo news topic.

## Usage

```
/create-sumo-video "Takakeisho wins the championship"
```

## Behind the Scenes

This command triggers the **VideoAgent**, which performs the following:
1.  **Research & Scenario**: Writes a script based on the topic.
2.  **Image Generation**: Creates relevant images for each scene.
3.  **Voice Over**: Synthesizes audio using VoiceVox.
4.  **Assembly**: Compiles everything into an MP4 video.

## Output

The video will be saved to `output/video.mp4` (or similar timestamped filename).
