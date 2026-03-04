#!/bin/bash
# 测试 PEM 证书生成功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

OUTPUT_DIR="$OUTPUT_BASE/pem-test"

echo "🧪 测试 PEM 证书生成"

setup_output_dir "$OUTPUT_DIR"
cp "$FIXTURES_DIR/sample-pfx/certificate.pfx" "$OUTPUT_DIR/"

run_sslkit -m pem -d "$OUTPUT_DIR" -p test123456 -o test_output
assert_file "$OUTPUT_DIR/test_output.pem" "PEM 文件未生成"
assert_file "$OUTPUT_DIR/test_output.key" "KEY 文件未生成"
assert_content "$OUTPUT_DIR/test_output.pem" "BEGIN CERTIFICATE" "PEM 文件格式不正确"
assert_content "$OUTPUT_DIR/test_output.key" "BEGIN" "KEY 文件格式不正确"

rm -rf "$OUTPUT_DIR"
echo "  ✓ PEM 测试通过"
