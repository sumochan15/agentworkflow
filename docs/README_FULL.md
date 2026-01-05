# AI Jonbin Movie Maker

**Autonomous video generation powered by AI Agents**

Transform text or URLs into engaging video summaries with AI-generated scenarios, images, and voiceovers.

## Features

- **URL/Text Input**: Generate videos from news articles or custom text
- **Scenario Preview & Editing**: Review and customize the AI-generated scenario before video creation
- **Voice Provider Selection**: Choose between ElevenLabs (premium) or VoiceVox (free)
- **Custom Assets**: Upload reference images and background music
- **Real-time Progress**: Live progress tracking with Server-Sent Events
- **API Key Management**: Secure client-side storage with LocalStorage

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 3.4 + shadcn/ui components
- **AI Integration**:
  - OpenAI GPT-4 (scenario generation)
  - Google Gemini (image generation)
  - ElevenLabs / VoiceVox (voice synthesis)
- **Video Processing**: FFmpeg (@ffmpeg-installer/ffmpeg)
- **Deployment**: Vercel Pro (Fluid Compute enabled)

## Architecture

### User Flow

1. **Input** → Enter URL/text, configure API keys, upload assets
2. **Scenario Preview** → Review and edit AI-generated scenario
3. **Processing** → Real-time progress tracking via SSE
4. **Download** → Get completed video

### Backend Processing

- **Job-based async processing**: Returns job ID immediately, processes in background
- **Progress updates**: Server-Sent Events (SSE) for real-time status
- **Temporary storage**: Files auto-deleted after 60 minutes
- **Multiple stages**: Scenario → Images → Audio → Assembly → BGM

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- API Keys:
  - OpenAI API Key (required)
  - Google AI API Key (required)
  - ElevenLabs API Key (optional, for premium voices)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/agentworkflow.git
cd agentworkflow

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables (Development Only)

For local development, you can optionally set environment variables in `.env.local`:

```bash
# Optional: Pre-fill API keys for testing
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
ELEVENLABS_API_KEY=...
```

**Note**: In production, users enter API keys via the web UI (stored in browser LocalStorage).

## Usage

### 1. Configure API Keys

Click "APIキー設定" button to configure your API keys:
- **OpenAI API Key**: Required for scenario generation
- **Google AI API Key**: Required for image generation
- **ElevenLabs API Key**: Optional (for premium voices)

API keys are stored in your browser's LocalStorage and never sent to our servers permanently.

### 2. Create Video

**Input Form**:
- Enter a URL (news article) or paste text
- Select voice provider (ElevenLabs or VoiceVox)
- (Optional) Enter ElevenLabs voice ID
- (Optional) Upload reference image for image generation
- (Optional) Upload background music (MP3/WAV)

**Scenario Preview**:
- Review the AI-generated scenario
- Edit scene text and image prompts
- Add or remove scenes
- Click "承認して動画生成" to proceed

**Processing**:
- Watch real-time progress through 5 stages:
  1. シナリオ生成 (Scenario generation)
  2. 画像生成 (Image generation)
  3. 音声生成 (Voice synthesis)
  4. 動画組み立て (Video assembly)
  5. BGM追加 (BGM integration)

**Download**:
- Download completed video as MP4
- Create another video or start over

## Deployment (Vercel)

### Prerequisites

- Vercel account (Pro plan required for Fluid Compute)
- GitHub repository

### Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Framework: Next.js (auto-detected)

3. **Enable Fluid Compute** (Vercel Pro):
   - Go to Project Settings → Functions
   - Enable "Fluid Compute"
   - This allows up to 800 seconds execution time for video processing

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Visit your production URL

### No Environment Variables Needed

This application does not require server-side environment variables. All API keys are managed client-side via the web UI.

## Project Structure

```
agentworkflow/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── video/
│   │   │   ├── generate/         # POST: Start video generation
│   │   │   ├── status/[jobId]/   # GET: SSE progress stream
│   │   │   └── download/[jobId]/ # GET: Download video
│   │   └── scenario/
│   │       └── preview/          # POST: Generate scenario preview
│   ├── components/               # React Components
│   │   ├── video-form.tsx        # Input form
│   │   ├── scenario-editor.tsx   # Scenario editing UI
│   │   ├── progress-tracker.tsx  # Real-time progress display
│   │   └── api-key-manager.tsx   # API key configuration
│   ├── lib/                      # Client utilities
│   ├── page.tsx                  # Main page
│   └── layout.tsx                # Root layout
├── src/
│   ├── agents/                   # Video generation agents
│   │   └── video-agent.ts        # Core video generation logic
│   ├── lib/                      # Server utilities
│   │   ├── video-job-manager.ts  # Job lifecycle management
│   │   └── progress-emitter.ts   # SSE progress events
│   └── data/                     # Dictionaries & data files
└── public/                       # Static assets
```

## API Reference

### POST /api/video/generate

Start video generation job.

**Request** (FormData):
```typescript
{
  input: string;              // URL or text
  provider: 'elevenlabs' | 'voicevox';
  voiceId?: string;
  apiKeys: string;            // JSON: { openai, google, elevenlabs? }
  scenario: string;           // JSON: Scenario object
  referenceImage?: File;
  bgm?: File;
}
```

**Response**:
```json
{
  "jobId": "uuid-here",
  "status": "pending"
}
```

### GET /api/video/status/[jobId]

Server-Sent Events stream for progress updates.

**Response** (text/event-stream):
```
data: {"step":"scenario","status":"in_progress","progress":10,"message":"..."}
data: {"step":"images","status":"in_progress","progress":40,"message":"..."}
data: {"step":"complete","status":"completed","progress":100,"data":{...}}
```

### GET /api/video/download/[jobId]

Download completed video.

**Response**: video/mp4 file

### POST /api/scenario/preview

Generate scenario preview without creating video.

**Request**:
```json
{
  "input": "URL or text",
  "apiKeys": { "openai": "..." }
}
```

**Response**:
```json
{
  "scenario": {
    "title": "...",
    "scenes": [...]
  }
}
```

## Development

### Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint
```

### Testing

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## Architecture Details

### VideoAgent Refactoring

The original CLI-based VideoAgent was refactored to support web integration:

- **API Key Injection**: Constructor accepts `VideoAgentOptions` instead of reading from env vars
- **Progress Callbacks**: Emits progress events at each stage
- **Custom File Paths**: Accepts reference image and BGM paths as parameters
- **Scenario Pre-generation**: Can skip scenario generation if already provided

### Job Management

`VideoJobManager` handles the lifecycle of video generation jobs:

- **UUID-based Job IDs**: Unique identifier for each video
- **Status Tracking**: pending → processing → completed/error
- **Metadata Storage**: Input, timestamps, output path, scenario
- **Automatic Cleanup**: Deletes files 60 minutes after creation

### Progress Events (SSE)

`ProgressEmitter` converts VideoAgent callbacks to Server-Sent Events:

- **Real-time Updates**: Clients receive progress via EventSource API
- **Keep-alive Pings**: Prevents connection timeout (every 15s)
- **Event Format**: JSON objects with step, status, progress, message

## Troubleshooting

### Build Errors

**Issue**: FFmpeg not found
- **Solution**: Ensure `@ffmpeg-installer/ffmpeg` is installed
- Run: `npm install @ffmpeg-installer/ffmpeg`

**Issue**: TypeScript errors in components
- **Solution**: Check `tsconfig.json` has `"jsx": "react-jsx"` and `"allowJs": true`

### Runtime Errors

**Issue**: 500 error on /api/video/generate
- **Check**: API keys are correctly formatted
- **Check**: Uploaded files are valid (images: PNG/JPG, audio: MP3/WAV)
- **Check**: File sizes within limits (images: 10MB, audio: 20MB)

**Issue**: SSE connection drops
- **Check**: Vercel Fluid Compute is enabled (Pro plan)
- **Check**: Function timeout is set to 800s in vercel.json

**Issue**: Video generation timeout
- **Solution**: For longer videos, consider:
  - Using fewer scenes
  - Lower resolution reference images
  - Shorter audio segments

## License

MIT

## Credits

- **Framework**: [Miyabi](https://github.com/ShunsukeHayashi/Autonomous-Operations) - Autonomous development framework
- **AI Models**: OpenAI GPT-4, Google Gemini, ElevenLabs, VoiceVox
- **Video Processing**: FFmpeg
- **UI Components**: shadcn/ui

---

🎬 **AI Jonbin Movie Maker** - Powered by Autonomous AI Agents
