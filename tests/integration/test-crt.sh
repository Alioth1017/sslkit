#!/bin/bash

# 测试 CRT 证书生成功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_DIR="$SCRIPT_DIR/../fixtures/sample-pem"
OUTPUT_DIR="$SCRIPT_DIR/../output/crt-test"

echo "🧪 测试 CRT 证书生成"
echo "===================="
echo ""

# 清理旧的输出目录
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 复制测试文件
echo "📋 准备测试文件..."
cp "$TEST_DIR/certificate.pem" "$OUTPUT_DIR/"
cp "$TEST_DIR/private.key" "$OUTPUT_DIR/"

# 运行 SSLKit
echo ""
echo "🔨 运行 SSLKit..."
cd "$PROJECT_DIR"
node dist/cli.js -m crt -d "$OUTPUT_DIR" -o test_output

# 验证结果
echo ""
echo "✅ 验证生成的文件..."

if [ ! -f "$OUTPUT_DIR/test_output.crt" ]; then
  echo "❌ 错误: CRT 文件未生成"
  exit 1
fi

if [ ! -f "$OUTPUT_DIR/private.key" ]; then
  echo "❌ 错误: KEY 文件不存在"
  exit 1
fi

# 检查 CRT 文件内容
echo "🔍 验证 CRT 文件内容..."
if ! grep -q "BEGIN CERTIFICATE" "$OUTPUT_DIR/test_output.crt"; then
  echo "❌ 错误: CRT 文件格式不正确"
  exit 1
fi

# 验证证书信息
echo "🔍 验证证书信息..."
openssl x509 -in "$OUTPUT_DIR/test_output.crt" -noout -subject -issuer -dates

echo ""
echo "✅ CRT 测试通过！"
echo ""
echo "生成的文件："
ls -lh "$OUTPUT_DIR"

# 清理
echo ""
read -p "是否清理测试文件? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -rf "$OUTPUT_DIR"
  echo "✅ 清理完成"
fi
