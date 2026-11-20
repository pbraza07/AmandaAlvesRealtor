#!/usr/bin/env bash
set -euo pipefail
# Pin both the engine and model. Keep the compiled helper across Render builds.
revision=0b9af32a8b3fa7e2ae5f15a9a08f5b10394993f5
model_sha=818710568da3ca15689e31a743197b520007872ff9576237bda97bd1b469c3d7
cache="${XDG_CACHE_HOME:-/opt/render/project/.cache}/meeting-language/$revision"
dest="$PWD/.meeting-language"
mkdir -p "$cache" "$dest"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
if [[ ! -x "$cache/detect" ]]; then
  git clone -q --depth 1 --branch v1.5.4 https://github.com/ggml-org/whisper.cpp.git "$work/engine"
  [[ $(git -C "$work/engine" rev-parse HEAD) == "$revision" ]]
  make -s -C "$work/engine" -j2 main AVX2_M=1 FMA_M= F16C_M= CPUINFO_CMD=true
  install -m 755 "$work/engine/main" "$cache/detect"
  cp "$work/engine/LICENSE" "$cache/LICENSE"
fi
if ! echo "$model_sha  $cache/tiny.bin" | sha256sum -c --status; then
  curl --retry 3 -fsSL https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin -o "$work/model"
  echo "$model_sha  $work/model" | sha256sum -c --status
  mv "$work/model" "$cache/tiny.bin"
fi
cp "$cache"/{detect,tiny.bin,LICENSE} "$dest/"
if command -v ffmpeg >/dev/null; then
  ln -sf "$(command -v ffmpeg)" "$dest/ffmpeg"
else
  # Native Render Linux fallback for decoding the owner's local media.
  curl --retry 3 -fsSL https://registry.npmjs.org/@ffmpeg-installer/linux-x64/-/linux-x64-4.1.0.tgz -o "$work/ffmpeg.tgz"
  [[ $(openssl dgst -sha512 -binary "$work/ffmpeg.tgz" | openssl base64 -A) == 'Y5BWhGLU/WpQjOArNIgXD3z5mxxdV8c41C+U15nsE5yF8tVcdCGet5zPs5Zy3Ta6bU7haGpIzryutqCGQA/W8A==' ]]
  tar -xzf "$work/ffmpeg.tgz" -C "$work" package/ffmpeg
  install -m 755 "$work/package/ffmpeg" "$dest/ffmpeg"
fi
"$dest/ffmpeg" -version >/dev/null
