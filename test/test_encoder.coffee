should = require "should"
util = require "util"

node_xz = require "../build/Release/node_xz"

describe "Engine", ->
  it "can be closed exactly once", ->
    engine = new node_xz.Engine()
    engine.close()
    (-> engine.close()).should.throw /closed/

  it "does what", ->
    writer = new node_xz.Engine()
    writer.feed("hello, hello!")

    b1 = new Buffer(128)
    n1 = writer.drain(b1, false)
    console.log "got: #{util.inspect(b1)} len #{n1}"

    b2 = new Buffer(128)
    n2 = writer.drain(b2, true)
    console.log "got: #{util.inspect(b2)} len #{n2}"

    writer.close()

    zzz = Buffer.concat([ b1.slice(0, n1), b2.slice(0, n2) ])
    console.log "total: #{util.inspect(zzz)} len #{zzz.length}"

    reader = new node_xz.Engine(true)
    reader.feed(zzz)

    b3 = new Buffer(128)
    n3 = reader.drain(b3, false)
    console.log "got: #{util.inspect(b3)} len #{n3}"
    console.log b3.slice(0, n3).toString()
