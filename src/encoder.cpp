#include <node.h>
#include <v8.h>

#include "lzma.h"

#include "encoder.h"

v8::Persistent<v8::Function> Encoder::constructor;

static lzma_stream blank_stream = LZMA_STREAM_INIT;

static const char *lzma_perror(lzma_ret err) {
  switch (err) {
    case LZMA_MEM_ERROR: return "Memory allocation failed";
    case LZMA_OPTIONS_ERROR: return "Compression options not supported";
    case LZMA_UNSUPPORTED_CHECK: return "Check type not supported";
    case LZMA_PROG_ERROR: return "Invalid arguments";
    default: return "?";
  }
}








Encoder::Encoder(void) : _active(false) {
  _stream = blank_stream;
}

Encoder::~Encoder() {
  if (_active) lzma_end(&_stream);
}

void Encoder::Init(v8::Handle<v8::Object> exports) {
  // constructor template
  v8::Local<v8::FunctionTemplate> t = v8::FunctionTemplate::New(New);
  t->SetClassName(v8::String::NewSymbol("Encoder"));
  t->InstanceTemplate()->SetInternalFieldCount(1);

  // methods
  t->PrototypeTemplate()->Set(v8::String::NewSymbol("close"), v8::FunctionTemplate::New(Encoder::Close)->GetFunction());
  constructor = v8::Persistent<v8::Function>::New(t->GetFunction());

  exports->Set(v8::String::NewSymbol("Encoder"), constructor);
}

v8::Handle<v8::Value> Encoder::New(const v8::Arguments& args) {
  v8::HandleScope scope;

  if (!args.IsConstructCall()) {
    // Invoked as plain function, turn into construct call.
    const int argc = 1;
    v8::Local<v8::Value> argv[argc] = { args[0] };
    return scope.Close(constructor->NewInstance(argc, argv));
  }

//    double value = args[0]->IsUndefined() ? 0 : args[0]->NumberValue();
  Encoder *obj = new Encoder();
  obj->Wrap(args.This());

  lzma_ret ret = lzma_easy_encoder(&obj->_stream, 6 | LZMA_PRESET_EXTREME, LZMA_CHECK_CRC64);
  if (ret != LZMA_OK) {
    delete obj;
    v8::ThrowException(v8::Exception::Error(v8::String::New(lzma_perror(ret))));
    return scope.Close(v8::Undefined());
  }

  obj->_active = true;
  return args.This();
}

v8::Handle<v8::Value> Encoder::Close(const v8::Arguments& args) {
  v8::HandleScope scope;

  Encoder *obj = ObjectWrap::Unwrap<Encoder>(args.This());
  if (!obj->_active) {
    v8::ThrowException(v8::Exception::Error(v8::String::New("Encoder has already been closed")));
    return scope.Close(v8::Undefined());
  }

  lzma_end(&obj->_stream);
  obj->_active = false;
  return scope.Close(v8::Undefined());
}
