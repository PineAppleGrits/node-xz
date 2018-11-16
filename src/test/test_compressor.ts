import "should";
import "source-map-support/register";

import * as fs from "fs";
import * as stream from "stream";
import * as xz from "../xz";

function bufferSource(b: string | Buffer) {
  if (typeof b == "string") b = Buffer.from(b);
  let s = new stream.Readable();
  s._read = (size) => {
    s.push(b);
    s.push(null);
  };
  return s;
}

class BufferSink extends stream.Writable {
  buffers: Buffer[] = [];

  _write(chunk: Buffer, encoding: string, callback: stream.TransformCallback) {
    this.buffers.push(chunk);
    callback(undefined);
  };

  getBuffer(): Buffer {
    return Buffer.concat(this.buffers);
  }
}


describe("Compressor/Decompressor", () => {
  it("can compress", (done) => {
    let c = new xz.Compressor();
    let out = new BufferSink();
    bufferSource("hello!").pipe(c).pipe(out);
    out.on("finish", () => {
      out.getBuffer().length.should.eql(56);
      done();
    });
  });

  it("can round-trip", (done) => {
    let data = "Hello, I'm Dr. Thaddeus Venture.";
    let c = new xz.Compressor();
    let d = new xz.Decompressor();
    let out = new BufferSink();
    bufferSource(data).pipe(c).pipe(d).pipe(out);
    out.on("finish", () => {
      out.getBuffer().toString().should.eql(data);
      done();
    });
  });

  it("can compress a big file", (done) => {
    let c = new xz.Compressor(9);
    let out = new BufferSink();
    fs.createReadStream("./testdata/minecraft.png").pipe(c).pipe(out);
    out.on("finish", () => {
      out.getBuffer().length.should.lessThan(fs.statSync("./testdata/minecraft.png").size);
      done();
    });
  });
});
