should = require "should"
util = require "util"

node_xz = require "../build/Release/node_xz"

describe "Encoder", ->
  it "can be closed exactly once", ->
    encoder = new node_xz.Encoder()
    encoder.close()
    (-> encoder.close()).should.throw /closed/

  it "does what", ->
    encoder = new node_xz.Encoder()
    encoder.feed("hello")

    b1 = new Buffer(128)
    n1 = encoder.drain(b1, false)
    console.log "got: #{util.inspect(b1)} len #{n1}"

    b2 = new Buffer(128)
    n2 = encoder.drain(b2, true)
    console.log "got: #{util.inspect(b2)} len #{n2}"

    encoder.close()

    zzz = Buffer.concat([ b1, b2 ])
    console.log "total: #{util.inspect(zzz)} len #{zzz.length}"

    decoder = new node_xz.Encoder(true)
    decoder.feed(zzz)

    b3 = new Buffer(128)
    n3 = decoder.drain(b3, false)
    console.log "got: #{b3} len #{n3}"
