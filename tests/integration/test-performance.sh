#!/bin/bash
# 性能测试 - 测试工具在不同负载下的表现

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

OUTPUT_DIR="$OUTPUT_BASE/performance"

echo "⚡ 性能测试"
echo ""

setup_output_dir "$OUTPUT_DIR"

# 测试 1: 单次转换
test_dir="$OUTPUT_DIR/single"
mkdir -p "$test_dir"
cp "$FIXTURES_DIR/sample-pem/certificate.pem" "$test_dir/"
cp "$FIXTURES_DIR/sample-pem/private.key" "$test_dir/"
START_TIME=$(date +%s%N)
run_sslkit -m pfx -d "$test_dir" -p test123 -o perf_test
END_TIME=$(date +%s%N)
echo "  单次转换:       $((($END_TIME - $START_TIME) / 1000000))ms"

# 测试 2: 批量 10 次
batch_dir="$OUTPUT_DIR/batch"
mkdir -p "$batch_dir"
START_TIME=$(date +%s%N)
for i in {1..10}; do
  test_sub="$batch_dir/test_$i"
  mkdir -p "$test_sub"
  cp "$FIXTURES_DIR/sample-pem/certificate.pem" "$test_sub/"
  cp "$FIXTURES_DIR/sample-pem/private.key" "$test_sub/"
  run_sslkit -m pfx -d "$test_sub" -p test123 -o batch_$i
done
END_TIME=$(date +%s%N)
ELAPSED=$((($END_TIME - $START_TIME) / 1000000))
echo "  批量 10 次:     ${ELAPSED}ms  (均 $((ELAPSED / 10))ms)"

# 测试 3: 各格式耗时
echo "  格式对比:"
for format in pfx pem crt; do
  format_dir="$OUTPUT_DIR/format_$format"
  mkdir -p "$format_dir"
  case $format in
    pem) cp "$FIXTURES_DIR/sample-pfx/certificate.pfx" "$format_dir/" ;;
    *)   cp "$FIXTURES_DIR/sample-pem/certificate.pem" "$format_dir/"
         cp "$FIXTURES_DIR/sample-pem/private.key" "$format_dir/" ;;
  esac
  START_TIME=$(date +%s%N)
  run_sslkit -m "$format" -d "$format_dir" -p test123456 -o "out"
  END_TIME=$(date +%s%N)
  printf "    %-5s %dms\n" "$format" "$((($END_TIME - $START_TIME) / 1000000))"
done

rm -rf "$OUTPUT_DIR"
echo ""
echo "  ✓ 性能测试完成"
