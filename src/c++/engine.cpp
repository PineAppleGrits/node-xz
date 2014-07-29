#include <node.h>
#include <node_buffer.h>
#include <v8.h>

#include "lzma.h"

#include "engine.h"

#define throwTypeError(str) do { \
  v8::ThrowException(v8::Exception::TypeError(v8::String::New(str))); \
  return scope.Close(v8::Undefined()); \
} while (0)

#define throwError(str) do { \
  v8::ThrowException(v8::Exception::Error(v8::String::New(str))); \
  return scope.Close(v8::Undefined()); \
} while (0)

v8::Persistent<v8::Function> Engine::constructor;

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


Engine::Engine(void) : _active(false) {
  _stream = blank_stream;
}

Engine::~Engine() {
  if (_active) lzma_end(&_stream);
}

void Engine::Init(v8::Handle<v8::Object> exports) {
  // constructor template
  v8::Local<v8::FunctionTemplate> t = v8::FunctionTemplate::New(New);
  t->SetClassName(v8::String::NewSymbol("Engine"));
  t->InstanceTemplate()->SetInternalFieldCount(1);

  // methods
  t->PrototypeTemplate()->Set(v8::String::NewSymbol("close"), v8::FunctionTemplate::New(Engine::Close)->GetFunction());
  t->PrototypeTemplate()->Set(v8::String::NewSymbol("feed"), v8::FunctionTemplate::New(Engine::Feed)->GetFunction());
  t->PrototypeTemplate()->Set(v8::String::NewSymbol("drain"), v8::FunctionTemplate::New(Engine::Drain)->GetFunction());
  constructor = v8::Persistent<v8::Function>::New(t->GetFunction());

  exports->Set(v8::String::NewSymbol("Engine"), constructor);
}

v8::Handle<v8::Value> Engine::New(const v8::Arguments& args) {
  v8::HandleScope scope;

  if (!args.IsConstructCall()) {
    // Invoked as plain function, turn into construct call.
    const int argc = 1;
    v8::Local<v8::Value> argv[argc] = { args[0] };
    return scope.Close(constructor->NewInstance(argc, argv));
  }

  Engine *obj = new Engine();
  obj->Wrap(args.This());

  lzma_ret ret;
  if (args.Length() > 0 && args[0]->BooleanValue()) {
    ret = lzma_stream_decoder(&obj->_stream, UINT64_MAX, 0);
  } else {
    ret = lzma_easy_encoder(&obj->_stream, 6 | LZMA_PRESET_EXTREME, LZMA_CHECK_NONE);
  }
  if (ret != LZMA_OK) {
    delete obj;
    throwError(lzma_perror(ret));
  }

  obj->_active = true;
  return args.This();
}

v8::Handle<v8::Value> Engine::Close(const v8::Arguments& args) {
  v8::HandleScope scope;

  Engine *obj = ObjectWrap::Unwrap<Engine>(args.This());
  if (!obj->_active) throwError("Engine has already been closed");

  lzma_end(&obj->_stream);
  obj->_active = false;
  return scope.Close(v8::Undefined());
}

// prep next "Drain" by setting up the input buffer.
// you may not let the buffer leave scope before draining!
v8::Handle<v8::Value> Engine::Feed(const v8::Arguments& args) {
  v8::HandleScope scope;

  Engine *obj = ObjectWrap::Unwrap<Engine>(args.This());
  if (!obj->_active) throwError("Engine has already been closed");

  if (args.Length() != 1) throwTypeError("Requires 1 argument: <buffer>");

  if (args[0]->IsString()) {
    v8::String::Utf8Value s(args[0]->ToString());
    obj->_stream.next_in = (const uint8_t *) *s;
    obj->_stream.avail_in = s.length();
  } else {
    v8::Local<v8::Object> buffer = args[0]->ToObject();
    if (!node::Buffer::HasInstance(buffer)) throwTypeError("Argument must be a buffer");
    obj->_stream.next_in = (const uint8_t *) node::Buffer::Data(buffer);
    obj->_stream.avail_in = node::Buffer::Length(buffer);
  }

  return scope.Close(v8::Integer::New(obj->_stream.avail_in));
}

// run the encoder, filling as much of the buffer as possible, returning the amount used.
// negative value means you need to run it again.
// if "finished" is true, tell the encoder there will be no more data, and to wrap it up.
v8::Handle<v8::Value> Engine::Drain(const v8::Arguments& args) {
  v8::HandleScope scope;

  Engine *obj = ObjectWrap::Unwrap<Engine>(args.This());
  if (!obj->_active) throwError("Engine has already been closed");
  if (args.Length() < 1 || args.Length() > 2) throwTypeError("Requires 1 or 2 arguments: <buffer> [<bool>]");

  v8::Local<v8::Object> buffer = args[0]->ToObject();
  if (!node::Buffer::HasInstance(buffer)) throwTypeError("Argument must be a buffer");

  lzma_action action = (args.Length() > 1 && args[1]->BooleanValue()) ? LZMA_FINISH : LZMA_RUN;

  obj->_stream.next_out = (uint8_t *) node::Buffer::Data(buffer);
  obj->_stream.avail_out = node::Buffer::Length(buffer);
  lzma_ret ret = lzma_code(&obj->_stream, action);
  if (ret != LZMA_OK && ret != LZMA_STREAM_END) throwError(lzma_perror(ret));

  int used = node::Buffer::Length(buffer) - obj->_stream.avail_out;
  if (obj->_stream.avail_in > 0 || (action == LZMA_FINISH && ret != LZMA_STREAM_END)) {
    // try more.
    return scope.Close(v8::Integer::New(-used));
  } else {
    return scope.Close(v8::Integer::New(used));
  }
}
