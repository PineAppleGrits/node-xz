#pragma once

#include <node.h>
#include <v8.h>

#include "lzma.h"

class Encoder : public node::ObjectWrap {
public:
  static void Init(v8::Handle<v8::Object> exports);

private:
  explicit Encoder(void);
  ~Encoder();

  static v8::Handle<v8::Value> New(const v8::Arguments& args);
  static v8::Handle<v8::Value> Close(const v8::Arguments& args);
  static v8::Handle<v8::Value> Feed(const v8::Arguments& args);
  static v8::Handle<v8::Value> Drain(const v8::Arguments& args);

  static v8::Persistent<v8::Function> constructor;

  lzma_stream _stream;
  bool _active;
};
