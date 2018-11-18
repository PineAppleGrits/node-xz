# xz

Xz is the node binding for the xz library, which implements (streaming) LZMA2 compression. It consists of a very thin binding around liblzma, and wrapper javascript classes to implement the nodejs "stream" transform interface. Typescript definitions are included.

LZMA2 is better than gzip & bzip2 in many cases. Read more about LZMA here: http://en.wikipedia.org/wiki/Lempel-Ziv-Markov_chain_algorithm


## install

```sh
$ npm install
$ npm test
```


## api

The API consists of only two stream transform classes: `Compressor` and `Decompressor`.

- `new xz.Compressor(preset?: number, options?: TransformOptions)`
- `new xz.Decompressor(options?: TransformOptions)`

The options object is passed to node's `Transform`. Compression takes a "preset" number, which is an abstraction of the compression difficulty level, from 1 to 9, where 1 puts in the least effort. The default is 6.

Both objects are stream transforms that consume and produce Buffers. Here's example code to compress the sample file included with this distribution:

```javascript
var fs = require("fs");
var xz = require("xz");

var compression = new xz.Compressor(9);
var inFile = fs.createReadStream("./testdata/minecraft.png");
var outFile = fs.createWriteStream("./testdata/minecraft.png.lzma2");

inFile.pipe(compression).pipe(outFile);
```


## performance api

Under the hood, liblzma requires two buffers for each iteration: an input and an output. The low-level API provides an `Engine` object that lets you manipulate those buffers yourself at the expense of ergonomics.

- `xz.compressRaw(preset?: number): Engine`
- `xz.decompressRaw(): Engine`

To compress or decompress data, "feed" a buffer segment into the engine, then "drain" the result. Each method takes a nodejs `Buffer`, an offset into that buffer, and the count of bytes to use.

- `engine.feed(buffer: Buffer, offset: number, length: number): number`
- `engine.drain(buffer: Buffer, offset: number, length: number, flags?: number): number`

`feed` returns the number of bytes written, which will always be the same as `length`. `drain` returns the number of bytes that liblzma used in the buffer you provided. If the number is negative, liblzma is not done draining (you didn't provide enough buffer space) and you need to call `drain` again with until it returns a positive number. For example, if `drain` returns -23, it used 23 bytes of the provided buffer, but has more data to provide.

`drain` uses the input buffer provided by `feed`, so it's important to *keep the input buffer in scope until `drain` is complete*.


## license

Apache 2 (open-source) license, included in 'LICENSE.txt'.


## authors

- @robey - Robey Pointer <robeypointer@gmail.com>
