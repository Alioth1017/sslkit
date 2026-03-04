#!/bin/bash
# 测试 PFX 证书生成功能

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

OUTPUT_DIR="$OUTPUT_BASE/pfx-test"

echo "🧪 测试 PFX 证书生成"

setup_output_dir "$OUTPUT_DIR"
cp "$FIXTURES_DIR/sample-pem/certificate.pem" "$OUTPUT_DIR/"
cp "$FIXTURES_DIR/sample-pem/private.key" "$OUTPUT_DIR/"

run_sslkit -m pfx -d "$OUTPUT_DIR" -p test123456 -o test_output
assert_file "$OUTPUT_DIR/test_output.pfx" "PFX 文件未生成"
assert_file "$OUTPUT_DIR/pfx-password.txt" "密码文件未生成"
openssl pkcs12 -in "$OUTPUT_DIR/test_output.pfx" -passin pass:test123456 -noout > /dev/null 2>&1 || { echo "  ✗ PFX 文件无法解析"; exit 1; }
assert_equal "$(cat "$OUTPUT_DIR/pfx-password.txt")" "test123456" "密码文件内容不正确"

rm -rf "$OUTPUT_DIR"
echo "  ✓ PFX 测试通过"
