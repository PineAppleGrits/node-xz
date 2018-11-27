#include "engine.h"

#define MODE_ENCODE 0
#define MODE_DECODE 1
#define ENCODE_FINISH 1

Napi::FunctionReference Engine::constructor;

static lzma_stream blank_stream = LZMA_STREAM_INIT;

static const char *lzma_perror(lzma_ret err) {
  switch (err) {
    case LZMA_MEM_ERROR: return "Memory allocation failed";
    case LZMA_MEMLIMIT_ERROR: return "Memory usage limit reached";
    case LZMA_FORMAT_ERROR: return "File format not recognized";
    case LZMA_OPTIONS_ERROR: return "Compression options not supported";
    case LZMA_DATA_ERROR: return "Data is corrupt";
    case LZMA_BUF_ERROR: return "No progress is possible (internal error)";
    case LZMA_UNSUPPORTED_CHECK: return "Check type not supported";
    case LZMA_PROG_ERROR: return "Invalid arguments";
    default: return "?";
  }
}


Napi::Object Engine::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "Engine", {
    InstanceMethod("close", &Engine::Close),
    InstanceMethod("process", &Engine::Process),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Engine", func);
  exports.Set("MODE_ENCODE", Napi::Number::New(env, MODE_ENCODE));
  exports.Set("MODE_DECODE", Napi::Number::New(env, MODE_DECODE));
  exports.Set("ENCODE_FINISH", Napi::Number::New(env, ENCODE_FINISH));
  return exports;
}

// new Engine(MODE_DECODE or MODE_ENCODE, [ preset ]);
// "preset" is the compression level (0 - 9)
Engine::Engine(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Engine>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  stream = blank_stream;
  active = false;

  int mode = (info.Length() > 0 && !info[0].IsUndefined()) ? info[0].As<Napi::Number>().Int32Value() : 0;
  int preset = (info.Length() > 1 && !info[1].IsUndefined()) ? info[1].As<Napi::Number>().Int32Value() : 6;

  lzma_ret ret;
  if (mode == MODE_DECODE) {
    ret = lzma_stream_decoder(&stream, UINT64_MAX, 0);
  } else {
    ret = lzma_easy_encoder(&stream, preset, LZMA_CHECK_NONE);
  }
  if (ret != LZMA_OK) {
    Napi::Error::New(env, lzma_perror(ret)).ThrowAsJavaScriptException();
    return;
  }

  active = true;
}

Engine::~Engine() {
  if (active) lzma_end(&stream);
}

Napi::Value Engine::Close(const Napi::CallbackInfo& info) {
  if (!active) {
    Napi::Error::New(info.Env(), "Engine has already been closed").ThrowAsJavaScriptException();
    return Napi::Value();
  }

  lzma_end(&stream);
  active = false;
  return info.Env().Undefined();
}

Napi::Value Engine::Process(const Napi::CallbackInfo& info) {
  if (!active) {
    Napi::Error::New(info.Env(), "Engine has already been closed").ThrowAsJavaScriptException();
    buffer_ref.Reset();
    return Napi::Value();
  }

  if (info.Length() < 2 || !info[1].IsBuffer() || !(info[0].IsBuffer() || info[0].IsUndefined())) {
    Napi::Error::New(
      info.Env(),
      "Requires 2 or 3 arguments: <buffer|undefined> <buffer> [flags]"
    ).ThrowAsJavaScriptException();
    buffer_ref.Reset();
    return Napi::Value();
  }

  if (info[0].IsBuffer()) {
    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    stream.next_in = (const uint8_t *) buffer.Data();
    stream.avail_in = buffer.Length();
    // keep a copy:
    buffer_ref.Reset(buffer, 1);
  } else if (buffer_ref.IsEmpty()) {
    stream.next_in = nullptr;
    stream.avail_in = 0;
  }

  Napi::Buffer<uint8_t> buffer = info[1].As<Napi::Buffer<uint8_t>>();
  int flags = (info.Length() > 2 && info[2].IsNumber()) ? info[2].As<Napi::Number>().Int32Value() : 0;

  lzma_action action = (flags & ENCODE_FINISH) ? LZMA_FINISH : LZMA_RUN;
  stream.next_out = (uint8_t *) buffer.Data();
  stream.avail_out = buffer.Length();

  lzma_ret ret = lzma_code(&stream, action);
  if (ret != LZMA_OK && ret != LZMA_STREAM_END) {
    Napi::Error::New(info.Env(), lzma_perror(ret)).ThrowAsJavaScriptException();
    return Napi::Value();
  }

  int used = buffer.Length() - stream.avail_out;
  if (stream.avail_in > 0 || (action == LZMA_FINISH && ret != LZMA_STREAM_END)) {
    // need more space!
    return Napi::Number::New(info.Env(), -used);
  } else {
    buffer_ref.Reset();
    return Napi::Number::New(info.Env(), used);
  }
}
