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

- `new xz.Compressor(options?: XzTransformOptions)`
- `new xz.Decompressor(options?: XzTransformOptions)`

The options object is passed to node's `Transform`, and has two additional optional fields:

- `preset: number`: an abstraction of the compression difficulty level, from 1 to 9, where 1 puts in the least effort. The default is 6.
- `bufferSize: number`: minimum buffer size to use for encoding/decoding blocks of data. The default is 1KB, but it will grow to match the block size of its input as it processes data. (You shouldn't normally need to care about this.)

Both objects are stream transforms that consume and produce Buffers. Here's example code to compress the sample file included with this distribution:

```javascript
var fs = require("fs");
var xz = require("xz");

var compression = new xz.Compressor(9);
var inFile = fs.createReadStream("./testdata/minecraft.png");
var outFile = fs.createWriteStream("./testdata/minecraft.png.lzma2");

inFile.pipe(compression).pipe(outFile);
```


## non-streaming api

If you aren't using nodejs streams, the `process` method will process one buffer at a time:

- `process(input: Buffer | undefined, flags?: number): Buffer`

It feeds a `Buffer` into the lzma2 engine and returns any processed data. The returned `Buffer` may have a length of 0.

The only possible flag is `ENCODE_FINISH`, which tells the lzma2 engine that the stream is complete. On `ENCODE_FINISH`, the returned `Buffer` is the final one, and an input `Buffer` is optional. (lzma2 keeps a large internal buffer while compressing, so it's common to receive empty `Buffer`s while you compress, followed by a large final `Buffer` when you end the stream with `ENCODE_FINISH`.)


## license

Apache 2 (open-source) license, included in 'LICENSE.txt'.


## authors

- @robey - Robey Pointer <robeypointer@gmail.com>
