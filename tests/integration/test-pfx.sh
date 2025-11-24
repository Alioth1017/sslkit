#!/bin/bash

# 测试 PFX 证书生成功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_DIR="$SCRIPT_DIR/../fixtures/sample-pem"
OUTPUT_DIR="$SCRIPT_DIR/../output/pfx-test"

echo "🧪 测试 PFX 证书生成"
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
node dist/cli.js -m pfx -d "$OUTPUT_DIR" -p test123456 -o test_output

# 验证结果
echo ""
echo "✅ 验证生成的文件..."

if [ ! -f "$OUTPUT_DIR/test_output.pfx" ]; then
  echo "❌ 错误: PFX 文件未生成"
  exit 1
fi

if [ ! -f "$OUTPUT_DIR/pfx-password.txt" ]; then
  echo "❌ 错误: 密码文件未生成"
  exit 1
fi

# 检查文件大小
PFX_SIZE=$(stat -f%z "$OUTPUT_DIR/test_output.pfx" 2>/dev/null || stat -c%s "$OUTPUT_DIR/test_output.pfx")
if [ "$PFX_SIZE" -lt 100 ]; then
  echo "❌ 错误: PFX 文件大小异常 (${PFX_SIZE} bytes)"
  exit 1
fi

# 验证 PFX 文件内容
echo "🔍 验证 PFX 文件内容..."
openssl pkcs12 -in "$OUTPUT_DIR/test_output.pfx" -passin pass:test123456 -noout 2>&1 | head -1

# 验证密码文件
PASSWORD=$(cat "$OUTPUT_DIR/pfx-password.txt")
if [ "$PASSWORD" != "test123456" ]; then
  echo "❌ 错误: 密码文件内容不正确"
  exit 1
fi

echo ""
echo "✅ PFX 测试通过！"
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
