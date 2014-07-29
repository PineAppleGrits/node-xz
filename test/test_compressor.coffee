should = require "should"
stream = require "stream"
util = require "util"

xz = require "../lib/xz"

hexLogger = new stream.Writable()
hexLogger._write = (chunk, encoding, callback) ->
  console.log "==> " + util.inspect(chunk)
  callback(null)

bufferSource = (b) ->
  if typeof b == "string" then b = new Buffer(b)
  s = new stream.Readable()
  s._read = (size) ->
    s.push b
    s.push null
  s

bufferSink = ->
  s = new stream.Writable()
  s.buffers = []
  s._write = (chunk, encoding, callback) ->
    s.buffers.push chunk
    callback(null)
  s.getBuffer = -> Buffer.concat(s.buffers)
  s

describe "Compressor/Decompressor", ->
  it "can compress", (done) ->
    c = new xz.Compressor()
    out = bufferSink()
    bufferSource("hello!").pipe(c).pipe(out)
    out.on "finish", ->
      out.getBuffer().length.should.eql 56
      done()

  it "can round-trip", (done) ->
    data = "Hello, I'm Dr. Thaddeus Venture."
    c = new xz.Compressor()
    d = new xz.Decompressor()
    out = bufferSink()
    bufferSource(data).pipe(c).pipe(d).pipe(out)
    out.on "finish", ->
      out.getBuffer().toString().should.eql data
      done()
