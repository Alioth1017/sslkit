#!/bin/bash
# 测试 JKS 证书生成功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

OUTPUT_DIR="$OUTPUT_BASE/jks-test"

echo "🧪 测试 JKS 证书生成"

if ! command -v keytool &> /dev/null; then
  echo "  - keytool 未找到，跳过 JKS 测试"
  exit 0
fi

setup_output_dir "$OUTPUT_DIR"
cp "$FIXTURES_DIR/sample-pfx/certificate.pfx" "$OUTPUT_DIR/"

run_sslkit -m jks -d "$OUTPUT_DIR" -p test123456 -o test_output
assert_file "$OUTPUT_DIR/test_output.jks" "JKS 文件未生成"
assert_file "$OUTPUT_DIR/jks-password.txt" "密码文件未生成"
keytool -list -keystore "$OUTPUT_DIR/test_output.jks" -storepass test123456 -storetype JKS > /dev/null 2>&1 || { echo "  ✗ JKS 文件无法解析"; exit 1; }
assert_equal "$(cat "$OUTPUT_DIR/jks-password.txt")" "test123456" "密码文件内容不正确"

rm -rf "$OUTPUT_DIR"
echo "  ✓ JKS 测试通过"
