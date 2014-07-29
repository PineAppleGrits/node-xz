node_xz = require "../build/Release/node_xz.node"
stream = require "stream"
util = require "util"

DEFAULT_BUFSIZE = 16384

class XzStream extends stream.Transform
  constructor: (isDecompressing, options) ->
    super(options)
    @engine = new node_xz.Engine(isDecompressing)

  _transform: (chunk, encoding, callback) ->
    @engine.feed(chunk)
    @__drain(chunk.length, false)
    callback(null)

  _flush: (callback) ->
    @__drain(0, true)
    callback(null)

  __drain: (estimate, finished=false) ->
    bufSize = Math.max(estimate, DEFAULT_BUFSIZE)
    segments = []
    n = -1
    while n < 0
      buffer = new Buffer(bufSize)
      n = @engine.drain(buffer, finished)
      segments.push buffer.slice(0, Math.abs(n))
    @push Buffer.concat(segments)


class Compressor extends XzStream
  constructor: (options) ->
    super(false, options)

class Decompressor extends XzStream
  constructor: (options) ->
    super(true, options)


exports.Compressor = Compressor
exports.Decompressor = Decompressor
