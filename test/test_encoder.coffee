should = require "should"
node_xz = require "../build/Release/node_xz"

describe "Encoder", ->
  it "can be closed exactly once", ->
    encoder = new node_xz.Encoder()
    encoder.close()
    (-> encoder.close()).should.throw /closed/
