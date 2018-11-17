#pragma once

#include <napi.h>
#include "lzma.h"

/**
 * This low-level wrapper is unpleasant, and isn't meant to be used directly.
 * It just provides access to the raw stream engine in xz.
 */
class Engine : public Napi::ObjectWrap<Engine> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  explicit Engine(const Napi::CallbackInfo& info);
  ~Engine();

private:
  Napi::Value Close(const Napi::CallbackInfo& info);
  Napi::Value Feed(const Napi::CallbackInfo& info);
  Napi::Value Drain(const Napi::CallbackInfo& info);

  static Napi::FunctionReference constructor;

  lzma_stream stream;
  bool active;
};
