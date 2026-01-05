import { EventEmitter } from 'events';
import type { ProgressEvent } from '@/app/types/video';

export class ProgressEmitter extends EventEmitter {
  constructor(private jobId: string) {
    super();
  }

  /**
   * Emit a progress event
   */
  emitProgress(event: ProgressEvent): void {
    this.emit('progress', event);
  }

  /**
   * Convert to Server-Sent Events (SSE) stream
   */
  toSSEStream(): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const emitter = this;

    return new ReadableStream({
      start(controller) {
        // Progress event handler
        const progressHandler = (event: ProgressEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));

          // Close stream on completion or error
          if (event.step === 'complete') {
            controller.close();
          }
        };

        emitter.on('progress', progressHandler);

        // Keep-alive ping every 15 seconds
        const pingInterval = setInterval(() => {
          controller.enqueue(encoder.encode(': ping\n\n'));
        }, 15000);

        // Cleanup on cancel
        return () => {
          emitter.off('progress', progressHandler);
          clearInterval(pingInterval);
        };
      },
    });
  }
}
