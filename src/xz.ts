import * as stream from "stream";

const node_xz = require("../build/Release/node_xz.node");

const DEFAULT_PRESET = 6;

const MIN_BUFSIZE = 1024;
const MAX_BUFSIZE = 64 * 1024;

export type EngineCallback = (error?: Error, used?: number) => void;

export interface Engine {
  close(): void;
  process(input: Buffer | undefined, output: Buffer, flags: number, callback: EngineCallback): number;
}

export const ENCODE_FINISH = node_xz.ENCODE_FINISH;
export const MODE_ENCODE = node_xz.MODE_ENCODE;
export const MODE_DECODE = node_xz.MODE_DECODE;

export interface XzTransformOptions extends stream.TransformOptions {
  preset?: number;
  bufferSize?: number;
}

class XzStream extends stream.Transform {
  engine: Engine;

  // keep one buffer around in case we can reuse it between calls.
  buffer: Buffer;

  constructor(mode: number, options?: XzTransformOptions) {
    super(options);
    this.engine = new node_xz.Engine(mode, options ? options.preset : DEFAULT_PRESET);
    this.buffer = Buffer.alloc(options && options.bufferSize ? options.bufferSize : MIN_BUFSIZE);
  }

  _transform(chunk: Buffer | string, encoding: string | undefined, callback: stream.TransformCallback) {
    const input = chunk instanceof Buffer ? chunk : Buffer.from(chunk, encoding);
    const bufSize = Math.max(Math.min(input.length * 1.1, MAX_BUFSIZE), MIN_BUFSIZE);
    if (bufSize > this.buffer.length) this.buffer = Buffer.alloc(bufSize);
    this.processLoop(input, 0, [], callback);
  }

  _flush(callback: stream.TransformCallback) {
    this.processLoop(undefined, node_xz.ENCODE_FINISH, [], callback);
  }

  processLoop(input: Buffer | undefined, flags: number, segments: Buffer[], callback: stream.TransformCallback) {
    // slightly too clever: we use the same buffer each time, as long as it's
    // big enough: the `concat` at the end will create a new one. if we need
    // to go back for a 2nd+ time, we replace it, since the array of `slice`
    // are just views.
    this.engine.process(input, this.buffer, flags, (error, used) => {
      if (error || used === undefined) return callback(error || new Error("Unknown error"));
      let size = Math.abs(used);
      segments.push(this.buffer.slice(0, size));
      if (used < 0) {
        this.buffer = Buffer.alloc(this.buffer.length);
        this.processLoop(undefined, flags, segments, callback);
      } else {
        callback(undefined, Buffer.concat(segments));
      }
    });
  }
}

export class Compressor extends XzStream {
  constructor(options?: XzTransformOptions) {
    super(MODE_ENCODE, options);
  }
}

export class Decompressor extends XzStream {
  constructor(options?: XzTransformOptions) {
    super(MODE_DECODE, options);
  }
}

export function compressRaw(preset: number = DEFAULT_PRESET): Engine {
  return new node_xz.Engine(MODE_ENCODE, preset);
}

export function decompressRaw(): Engine {
  return new node_xz.Engine(MODE_DECODE, 0);
}
