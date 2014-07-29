#include <node.h>
#include <v8.h>

#include "lzma.h"

#include "engine.h"

void init(v8::Handle<v8::Object> exports) {
  Engine::Init(exports);
}

NODE_MODULE(node_xz, init);
