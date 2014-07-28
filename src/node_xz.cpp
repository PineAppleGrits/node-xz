#include <node.h>
#include <v8.h>

#include "lzma.h"

#include "encoder.h"

void init(v8::Handle<v8::Object> exports) {
  Encoder::Init(exports);
}

NODE_MODULE(node_xz, init);
