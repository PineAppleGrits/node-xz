import { compressRaw, decompressRaw, ENCODE_FINISH } from "../xz";

import "should";
import "source-map-support/register";

describe("Engine", () => {
  it("can be closed exactly once", () => {
    let engine = compressRaw(6);
    engine.close();
    (() => engine.close()).should.throw(/closed/);
  });

  it("encodes in steps", () => {
    let writer = compressRaw(6);
    writer.feed(Buffer.from("hello, hello!"), 0, 13);
    let b1 = Buffer.alloc(128);
    let n1 = writer.drain(b1, 0, b1.length);
    n1.should.eql(24);
    let b2 = Buffer.alloc(128);
    let n2 = writer.drain(b2, 0, b2.length, ENCODE_FINISH);
    n2.should.eql(40);
  });

  it("encodes all at once", () => {
    let writer = compressRaw(6);
    writer.feed(Buffer.from("hello, hello!"), 0, 13);
    let b1 = Buffer.alloc(128);
    let n1 = writer.drain(b1, 0, b1.length, ENCODE_FINISH);
    n1.should.eql(64);
  });

  it("copes with insufficient space", () => {
    let writer = compressRaw(6);
    writer.feed(Buffer.from("hello, hello!"), 0, 13);
    let b1 = Buffer.alloc(32);
    let n1 = writer.drain(b1, 0, b1.length, ENCODE_FINISH);
    n1.should.eql(-32);
    let b2 = Buffer.alloc(32);
    let n2 = writer.drain(b2, 0, b2.length, ENCODE_FINISH);
    n2.should.eql(32);

    let fullWriter = compressRaw(6);
    fullWriter.feed(Buffer.from("hello, hello!"), 0, 13);
    let bf = Buffer.alloc(64);
    let nf = fullWriter.drain(bf, 0, bf.length, ENCODE_FINISH);
    nf.should.eql(64);
    Buffer.concat([ b1, b2 ]).should.eql(bf);
  });

  it("can decode what it encodes", () => {
    let writer = compressRaw(6);
    writer.feed(Buffer.from("hello, hello!"), 0, 13);
    let b1 = Buffer.alloc(128);
    let n1 = writer.drain(b1, 0, b1.length, ENCODE_FINISH);
    writer.close();

    let reader = decompressRaw();
    reader.feed(b1.slice(0, n1), 0, n1);

    let b2 = Buffer.alloc(128);
    let n2 = reader.drain(b2, 0, b2.length);
    b2.slice(0, n2).toString().should.eql("hello, hello!");
  });

  it("encodes into an offset", () => {
    const buffer = Buffer.alloc(64);
    Buffer.from("hello").copy(buffer);

    const writer = compressRaw(6);
    writer.feed(buffer, 0, 5);
    writer.drain(buffer, 8, 56, ENCODE_FINISH).should.eql(56);

    buffer[0] = 0;
    buffer[2] = 9;
    const reader = decompressRaw();
    reader.feed(buffer, 8, 56);
    reader.drain(buffer, 0, 8, ENCODE_FINISH).should.eql(5);

    buffer.slice(0, 5).toString().should.eql("hello");
  });
});
