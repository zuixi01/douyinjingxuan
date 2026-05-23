#!/bin/bash

# 移动端视频压缩脚本 - 激进压缩
INPUT_DIR="/Users/mac/qianzhu Vault/project/douyin/douyinjingxuan/public/videos"
OUTPUT_DIR="/Users/mac/qianzhu Vault/project/douyin/douyinjingxuan/public/videos/mobile"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 压缩参数 - 针对移动端优化
HEIGHT=480
CRF=28  # 值越大压缩越狠，质量越低（范围0-51，28是平衡点）
PRESET="slow"  # 更慢的预设获得更好的压缩比
AUDIO_BITRATE="96k"

echo "开始压缩视频（移动端优化）..."
echo "目标分辨率: ${HEIGHT}p"
echo "CRF质量: $CRF"
echo ""

# 遍历所有mp4文件
for input_file in "$INPUT_DIR"/*.mp4; do
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
        original_height=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$input_file" 2>/dev/null)

        # 如果原始高度小于目标高度，保持原始分辨率
        if [ "$original_height" -le "$HEIGHT" ] 2>/dev/null; then
            scale_filter="scale=-2:$original_height"
        else
            scale_filter="scale=-2:$HEIGHT"
        fi

        # 压缩视频 - 使用CRF模式
        ffmpeg -i "$input_file" \
            -vf "$scale_filter" \
            -c:v libx264 \
            -preset $PRESET \
            -crf $CRF \
            -maxrate 800k \
            -bufsize 1600k \
            -c:a aac \
            -b:a $AUDIO_BITRATE \
            -ac 2 \
            -movflags +faststart \
            -y \
            "$output_file" 2>/dev/null

        if [ $? -eq 0 ]; then
            # 显示压缩结果
            original_size=$(ls -lh "$input_file" | awk '{print $5}')
            compressed_size=$(ls -lh "$output_file" | awk '{print $5}')
            echo "  ✓ 完成: $original_size -> $compressed_size"
        else
            echo "  ✗ 失败: $filename"
        fi
    fi
done

echo ""
echo "压缩完成！"
echo "原始文件: $INPUT_DIR"
echo "压缩文件: $OUTPUT_DIR"
