import * as stream from "stream";

const node_xz = require("../build/Release/node_xz.node");

const MIN_BUFSIZE = 1024;
const MAX_BUFSIZE = 64 * 1024;

export interface Engine {
  close(): void;
  process(input: Buffer | undefined, output: Buffer, flags?: number): number;
}

export const ENCODE_FINISH = node_xz.ENCODE_FINISH;

export interface XzTransformOptions extends stream.TransformOptions {
  preset?: number;
  bufferSize?: number;
}

class XzStream extends stream.Transform {
  engine: Engine;

  // keep one buffer around in case we can reuse it between calls.
  buffer: Buffer;

  constructor(mode?: number, options?: XzTransformOptions) {
    super(options);
    this.engine = new node_xz.Engine(mode, options ? options.preset : undefined);
    this.buffer = Buffer.alloc(options && options.bufferSize ? options.bufferSize : MIN_BUFSIZE);
  }

  _transform(chunk: Buffer | string, encoding: string | undefined, callback: stream.TransformCallback) {
    const rv = this.process(chunk instanceof Buffer ? chunk : Buffer.from(chunk, encoding));
    this.push(rv);
    callback(undefined);
  }

  _flush(callback: stream.TransformCallback) {
    const rv = this.process(undefined, node_xz.ENCODE_FINISH);
    this.push(rv);
    callback(undefined);
  }

  process(input: Buffer | undefined, flags?: number): Buffer {
    // slightly too clever: we use the same buffer each time, as long as it's
    // big enough: the `concat` at the end will create a new one. if we need
    // to go back for a 2nd+ time, we replace it, since the array of `slice`
    // are just views.
    const bufSize = Math.max(Math.min(input ? input.length * 1.1 : this.buffer.length, MAX_BUFSIZE), MIN_BUFSIZE);
    if (bufSize > this.buffer.length) this.buffer = Buffer.alloc(bufSize);

    let n = this.engine.process(input, this.buffer, flags);
    let size = Math.abs(n);
    const segments = [ this.buffer.slice(0, size) ];

    while (n < 0) {
      this.buffer = Buffer.alloc(this.buffer.length);
      n = this.engine.process(undefined, this.buffer, flags);
      size += Math.abs(n);
      segments.push(this.buffer.slice(0, Math.abs(n)));
    }

    return Buffer.concat(segments, size);
  }
}

export class Compressor extends XzStream {
  constructor(options?: XzTransformOptions) {
    super(node_xz.MODE_ENCODE, options);
  }
}

export class Decompressor extends XzStream {
  constructor(options?: XzTransformOptions) {
    super(node_xz.MODE_DECODE, options);
  }
}

export function compressRaw(preset?: number): Engine {
  return new node_xz.Engine(node_xz.MODE_ENCODE, preset);
}

export function decompressRaw(): Engine {
  return new node_xz.Engine(node_xz.MODE_DECODE);
}
