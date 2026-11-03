#!/bin/bash

# 视频压缩脚本 - 针对移动端优化
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)" || exit 1
INPUT_DIR="${1:-$SCRIPT_DIR/public/videos}"
OUTPUT_DIR="${2:-$INPUT_DIR/mobile}"

if [ "$#" -gt 2 ]; then
    echo "用法: bash compress-videos.sh [输入目录] [输出目录]" >&2
    exit 1
fi
for tool in ffmpeg ffprobe; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "缺少必要工具: $tool" >&2
        exit 1
    fi
done
if [ ! -d "$INPUT_DIR" ]; then
    echo "输入目录不存在: $INPUT_DIR" >&2
    exit 1
fi
shopt -s nullglob
input_files=("$INPUT_DIR"/*.mp4)
if [ "${#input_files[@]}" -eq 0 ]; then
    echo "输入目录没有 MP4 文件: $INPUT_DIR" >&2
    exit 1
fi

# 创建输出目录
mkdir -p "$OUTPUT_DIR" || exit 1
failed=0
temporary_output=""
trap 'if [ -n "$temporary_output" ]; then rm -f -- "$temporary_output"; fi' EXIT

# 压缩参数
HEIGHT=720
VIDEO_BITRATE="1500k"
AUDIO_BITRATE="128k"
PRESET="fast"

echo "开始压缩视频..."

# 遍历所有mp4文件
for input_file in "${input_files[@]}"; do
    if [ -f "$input_file" ]; then
        filename=$(basename "$input_file")
        output_file="$OUTPUT_DIR/$filename"

        # 跳过已存在的文件
        if [ -f "$output_file" ]; then
            echo "跳过已存在: $filename"
            continue
        fi

        echo "压缩: $filename"

        # 获取原始视频高度
        if ! original_height=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$input_file") \
            || ! [[ "$original_height" =~ ^[1-9][0-9]*$ ]]; then
            echo "  ✗ 无法读取视频高度: $filename" >&2
            failed=$((failed + 1))
            continue
        fi

        # 如果原始高度小于目标高度，保持原始分辨率
        if [ "$original_height" -le "$HEIGHT" ] 2>/dev/null; then
            scale_filter="scale=-2:$original_height"
        else
            scale_filter="scale=-2:$HEIGHT"
        fi

        temporary_output=$(mktemp "$OUTPUT_DIR/.compress-XXXXXX.mp4") || {
            echo "  ✗ 无法创建临时输出: $filename" >&2
            failed=$((failed + 1))
            continue
        }

        # 临时文件写入成功后再发布，失败不留下会被后续运行跳过的半成品。
        ffmpeg -hide_banner -loglevel error -i "$input_file" \
            -vf "$scale_filter" \
            -c:v libx264 \
            -preset $PRESET \
            -b:v $VIDEO_BITRATE \
            -maxrate $VIDEO_BITRATE \
            -bufsize 3000k \
            -c:a aac \
            -b:a $AUDIO_BITRATE \
            -movflags +faststart \
            -y \
            "$temporary_output"

        if [ $? -eq 0 ] && mv -n -- "$temporary_output" "$output_file"; then
            rm -f -- "$temporary_output"
            temporary_output=""
            # 显示压缩结果
            original_size=$(ls -lh "$input_file" | awk '{print $5}')
            compressed_size=$(ls -lh "$output_file" | awk '{print $5}')
            echo "  ✓ 完成: $original_size -> $compressed_size"
        else
            rm -f -- "$temporary_output"
            temporary_output=""
            echo "  ✗ 失败: $filename" >&2
            failed=$((failed + 1))
        fi
    fi
done

echo ""
if [ "$failed" -gt 0 ]; then
    echo "压缩结束，$failed 个文件失败；已存在的输出不会覆盖。" >&2
    exit 1
fi
echo "压缩完成！"
echo "原始文件: $INPUT_DIR"
echo "压缩文件: $OUTPUT_DIR"
