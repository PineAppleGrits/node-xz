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
        "src/encoder.h",
        "src/encoder.cpp"
      ],
      "libraries": [
        "<(SHARED_INTERMEDIATE_DIR)/xz-<@(xz_version)/src/liblzma/.libs/liblzma.a"
      ]
    }
  ]
}
