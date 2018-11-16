import "should";
import "source-map-support/register";

const node_xz = require("../../build/Release/node_xz");

describe("Engine", () => {
  it("can be closed exactly once", () => {
    let engine = new node_xz.Engine(node_xz.MODE_ENCODE, 6);
    engine.close();
    (() => engine.close()).should.throw(/closed/);
  });

  it("encodes in steps", () => {
    let writer = new node_xz.Engine(node_xz.MODE_ENCODE, 6);
    writer.feed(Buffer.from("hello, hello!"));
    let b1 = Buffer.alloc(128);
    let n1 = writer.drain(b1);
    n1.should.eql(24);
    let b2 = Buffer.alloc(128);
    let n2 = writer.drain(b2, node_xz.ENCODE_FINISH);
    n2.should.eql(40);
  });

  it("encodes all at once", () => {
    let writer = new node_xz.Engine(node_xz.MODE_ENCODE, 6);
    writer.feed(Buffer.from("hello, hello!"));
    let b1 = Buffer.alloc(128);
    let n1 = writer.drain(b1, node_xz.ENCODE_FINISH);
    n1.should.eql(64);
  });

  it("copes with insufficient space", () => {
    let writer = new node_xz.Engine(node_xz.MODE_ENCODE, 6);
    writer.feed(Buffer.from("hello, hello!"));
    let b1 = Buffer.alloc(32);
    let n1 = writer.drain(b1, node_xz.ENCODE_FINISH);
    n1.should.eql(-32);
    let b2 = Buffer.alloc(32);
    let n2 = writer.drain(b2, node_xz.ENCODE_FINISH);
    n2.should.eql(32);

    let fullWriter = new node_xz.Engine(node_xz.MODE_ENCODE, 6);
    fullWriter.feed(Buffer.from("hello, hello!"));
    let bf = Buffer.alloc(64);
    let nf = fullWriter.drain(bf, node_xz.ENCODE_FINISH);
    nf.should.eql(64);
    Buffer.concat([ b1, b2 ]).should.eql(bf);
  });

  it("can decode what it encodes", () => {
    let writer = new node_xz.Engine(node_xz.MODE_ENCODE, 6);
    writer.feed(Buffer.from("hello, hello!"));
    let b1 = Buffer.alloc(128);
    let n1 = writer.drain(b1, node_xz.ENCODE_FINISH);
    writer.close();

    let reader = new node_xz.Engine(node_xz.MODE_DECODE);
    reader.feed(b1.slice(0, n1));

    let b2 = Buffer.alloc(128);
    let n2 = reader.drain(b2);
    b2.slice(0, n2).toString().should.eql("hello, hello!");
  });
});
