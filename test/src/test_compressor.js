let fs = require("fs");
let should = require("should");
let stream = require("stream");
let util = require("util");

let xz = require("../../lib/xz");

function bufferSource(b) {
  if (typeof b == "string") b = new Buffer(b);
  let s = new stream.Readable();
  s._read = (size) => {
    s.push(b);
    s.push(null);
  };
  return s;
}

function bufferSink() {
  let s = new stream.Writable();
  s.buffers = [];
  s._write = (chunk, encoding, callback) => {
    s.buffers.push(chunk);
    callback(null);
  };
  s.getBuffer = () => Buffer.concat(s.buffers)
  return s;
}


describe("Compressor/Decompressor", () => {
  it("can compress", (done) => {
    let c = new xz.Compressor();
    let out = bufferSink();
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
    let out = bufferSink();
    bufferSource(data).pipe(c).pipe(d).pipe(out);
    out.on("finish", () => {
      out.getBuffer().toString().should.eql(data);
      done();
    });
  });

  it("can compress a big file", (done) => {
    let c = new xz.Compressor(9);
    let out = bufferSink();
    fs.createReadStream("./testdata/minecraft.png").pipe(c).pipe(out);
    out.on("finish", () => {
      out.getBuffer().length.should.lessThan(fs.statSync("./testdata/minecraft.png").size);
      done();
    });
  });
});
