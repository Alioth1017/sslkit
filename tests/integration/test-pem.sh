#!/bin/bash

# 测试 PEM 证书生成功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEST_DIR="$SCRIPT_DIR/../fixtures/sample-pfx"
OUTPUT_DIR="$SCRIPT_DIR/../output/pem-test"

echo "🧪 测试 PEM 证书生成"
echo "===================="
echo ""

# 清理旧的输出目录
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 复制测试文件
echo "📋 准备测试文件..."
cp "$TEST_DIR/certificate.pfx" "$OUTPUT_DIR/"

# 运行 SSLKit
echo ""
echo "🔨 运行 SSLKit..."
cd "$PROJECT_DIR"
node dist/cli.js -m pem -d "$OUTPUT_DIR" -p test123456 -o test_output

# 验证结果
echo ""
echo "✅ 验证生成的文件..."

if [ ! -f "$OUTPUT_DIR/test_output.pem" ]; then
  echo "❌ 错误: PEM 文件未生成"
  exit 1
fi

if [ ! -f "$OUTPUT_DIR/test_output.key" ]; then
  echo "❌ 错误: KEY 文件未生成"
  exit 1
fi

# 检查 PEM 文件内容
echo "🔍 验证 PEM 文件内容..."
if ! grep -q "BEGIN CERTIFICATE" "$OUTPUT_DIR/test_output.pem"; then
  echo "❌ 错误: PEM 文件格式不正确"
  exit 1
fi

# 检查 KEY 文件内容
echo "🔍 验证 KEY 文件内容..."
if ! grep -q "BEGIN" "$OUTPUT_DIR/test_output.key"; then
  echo "❌ 错误: KEY 文件格式不正确"
  exit 1
fi

# 验证证书信息
echo "🔍 验证证书信息..."
openssl x509 -in "$OUTPUT_DIR/test_output.pem" -noout -subject -issuer

echo ""
echo "✅ PEM 测试通过！"
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
