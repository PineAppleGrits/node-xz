should = require "should"
util = require "util"

node_xz = require "../build/Release/node_xz"

describe "Engine", ->
  it "can be closed exactly once", ->
    engine = new node_xz.Engine(node_xz.MODE_ENCODE, 6)
    engine.close()
    (-> engine.close()).should.throw /closed/

  it "encodes in steps", ->
    writer = new node_xz.Engine(node_xz.MODE_ENCODE, 6)
    writer.feed("hello, hello!")
    b1 = new Buffer(128)
    n1 = writer.drain(b1, false)
    n1.should.eql 24
    b2 = new Buffer(128)
    n2 = writer.drain(b2, true)
    n2.should.eql 40

  it "encodes all at once", ->
    writer = new node_xz.Engine(node_xz.MODE_ENCODE, 6)
    writer.feed("hello, hello!")
    b1 = new Buffer(128)
    n1 = writer.drain(b1, true)
    n1.should.eql 64

  it "copes with insufficient space", ->
    writer = new node_xz.Engine(node_xz.MODE_ENCODE, 6)
    writer.feed("hello, hello!")
    b1 = new Buffer(32)
    n1 = writer.drain(b1, true)
    n1.should.eql -32
    b2 = new Buffer(32)
    n2 = writer.drain(b2, true)
    n2.should.eql 32

    fullWriter = new node_xz.Engine(node_xz.MODE_ENCODE, 6)
    fullWriter.feed("hello, hello!")
    bf = new Buffer(64)
    nf = fullWriter.drain(bf, true)
    nf.should.eql 64
    Buffer.concat([ b1, b2 ]).should.eql bf

  it "can decode what it encodes", ->
    writer = new node_xz.Engine(node_xz.MODE_ENCODE, 6)
    writer.feed("hello, hello!")
    b1 = new Buffer(128)
    n1 = writer.drain(b1, true)
    writer.close()

    reader = new node_xz.Engine(node_xz.MODE_DECODE)
    reader.feed(b1.slice(0, n1))

    b2 = new Buffer(128)
    n2 = reader.drain(b2, false)
    b2.slice(0, n2).toString().should.eql "hello, hello!"
