node_xz = require "../build/Release/node_xz.node"
stream = require "stream"
util = require "util"

DEFAULT_BUFSIZE = 128 * 1024

class XzStream extends stream.Transform
  constructor: (mode, preset, options) ->
    super(options)
    @engine = new node_xz.Engine(mode, preset)

  _transform: (chunk, encoding, callback) ->
    @engine.feed(chunk)
    @__drain(chunk.length)
    callback(null)

  _flush: (callback) ->
    @__drain(DEFAULT_BUFSIZE, node_xz.ENCODE_FINISH)
    callback(null)

  __drain: (estimate, flags) ->
    bufSize = Math.min(estimate * 1.1, DEFAULT_BUFSIZE)
    segments = []
    n = -1
    while n < 0
      buffer = new Buffer(bufSize)
      n = @engine.drain(buffer, flags)
      segments.push buffer.slice(0, Math.abs(n))
    @push Buffer.concat(segments)


class Compressor extends XzStream
  constructor: (preset, options) ->
    super(node_xz.MODE_ENCODE, preset, options)

class Decompressor extends XzStream
  constructor: (options) ->
    super(node_xz.MODE_DECODE, null, options)


exports.Compressor = Compressor
exports.Decompressor = Decompressor
