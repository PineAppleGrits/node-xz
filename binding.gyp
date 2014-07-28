{
  "includes": [ "deps/common-xz.gypi" ],
  "targets": [
    {
      "target_name": "node_xz",
      "dependencies": [
        "deps/xz.gyp:xz"
      ],
      "sources": [
        "src/node_xz.cpp",
        "src/engine.h",
        "src/engine.cpp"
      ],
      "libraries": [
        "<(SHARED_INTERMEDIATE_DIR)/xz-<@(xz_version)/src/liblzma/.libs/liblzma.a"
      ]
    }
  ]
}
