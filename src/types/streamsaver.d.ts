declare module 'streamsaver' {  interface WritableStreamDefaultWriterLike {
    readonly closed: Promise<void>;
    readonly desiredSize: number | null;
    readonly ready: Promise<void>;
    abort(reason?: any): Promise<void>;
    close(): Promise<void>;
    releaseLock(): void;
    write(chunk: any): Promise<void>;
  }

  interface MitmOptions {
    mitm?: string;
  }

  interface StreamSaver extends MitmOptions {
    createWriteStream(filename: string, options?: { size?: number }): WritableStream;
    WritableStream: typeof WritableStream;
    supported: boolean;
    version: string;
    mitm: string;
  }

  const streamSaver: StreamSaver;
  export default streamSaver;
}
