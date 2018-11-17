# xz

Xz is the node binding for the xz library, which implements (streaming) LZMA2 compression. It consists of a very thin binding around liblzma, and wrapper javascript classes to implementh the nodejs "stream" transform interface. Typescript definitions are included.

LZMA2 is better than gzip & bzip2 in many cases. Read more about LZMA here: http://en.wikipedia.org/wiki/Lempel-Ziv-Markov_chain_algorithm


## install

```sh
$ npm install
$ npm test
```


## api

The API consists of only two stream transform classes: `Compressor` and `Decompressor`.

- `new xz.Compressor([preset], [options])`
- `new xz.Decompressor([options])`

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


## license

Apache 2 (open-source) license, included in 'LICENSE.txt'.


## authors

- @robey - Robey Pointer <robeypointer@gmail.com>
