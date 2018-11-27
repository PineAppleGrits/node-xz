import { compressRaw, decompressRaw, ENCODE_FINISH } from "../xz";

import "should";
import "source-map-support/register";

describe("Engine", () => {
  it("can be closed exactly once", () => {
    const engine = compressRaw(6);
    engine.close();
    (() => engine.close()).should.throw(/closed/);
  });

  it("encodes in steps", () => {
    const writer = compressRaw(6);
    const b1 = Buffer.alloc(128);
    const n1 = writer.process(Buffer.from("hello, hello!"), b1);
    n1.should.eql(24);

    const b2 = Buffer.alloc(128);
    const n2 = writer.process(undefined, b2, ENCODE_FINISH);
    n2.should.eql(40);
  });

  it("encodes all at once", () => {
    const writer = compressRaw(6);
    const b1 = Buffer.alloc(128);
    const n1 = writer.process(Buffer.from("hello, hello!"), b1, ENCODE_FINISH);
    n1.should.eql(64);
  });

  it("copes with insufficient space", () => {
    const writer = compressRaw(6);
    const b1 = Buffer.alloc(32);
    const n1 = writer.process(Buffer.from("hello, hello!"), b1, ENCODE_FINISH);
    n1.should.eql(-32);
    const b2 = Buffer.alloc(32);
    const n2 = writer.process(undefined, b2, ENCODE_FINISH);
    n2.should.eql(32);

    const fullWriter = compressRaw(6);
    const bf = Buffer.alloc(64);
    const nf = fullWriter.process(Buffer.from("hello, hello!"), bf, ENCODE_FINISH);
    nf.should.eql(64);
    Buffer.concat([ b1, b2 ]).should.eql(bf);
  });

  it("can decode what it encodes", () => {
    const writer = compressRaw(6);
    const b1 = Buffer.alloc(128);
    const n1 = writer.process(Buffer.from("hello, hello!"), b1, ENCODE_FINISH);
    writer.close();

    const reader = decompressRaw();
    let b2 = Buffer.alloc(128);
    const n2 = reader.process(b1.slice(0, n1), b2);
    b2.slice(0, n2).toString().should.eql("hello, hello!");
  });

  it("encodes into an offset", () => {
    const buffer = Buffer.alloc(64);
    Buffer.from("hello").copy(buffer);

    const writer = compressRaw(6);
    writer.process(buffer.slice(0, 5), buffer.slice(8, 64), ENCODE_FINISH).should.eql(56);

    buffer[0] = 0;
    buffer[2] = 9;

    const reader = decompressRaw();
    reader.process(buffer.slice(8, 64), buffer.slice(0, 8)).should.eql(5);
    buffer.slice(0, 5).toString().should.eql("hello");
  });
});
