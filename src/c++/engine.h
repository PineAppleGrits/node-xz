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
  // close()
  Napi::Value Close(const Napi::CallbackInfo& info);

  // process(input: Buffer | undefined, output: Buffer): number
  //   - returns a positive number (how much output was used) if the complete
  //     input was processed
  //   - returns a negative number (how much output was used, negative) if
  //     you need to call again with an undefined input and a new buffer to
  //     get more of the output
  Napi::Value Process(const Napi::CallbackInfo& info);

  static Napi::FunctionReference constructor;

  lzma_stream stream;
  bool active;

  // keep a handle to the input buffer if we expect to be called again
  // with the same input because the original output buffer wasn't big enough.
  Napi::Reference<Napi::Buffer<uint8_t>> buffer_ref;
};
