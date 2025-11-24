#!/bin/bash

# 性能测试 - 测试工具在不同负载下的表现

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/../output/performance"

echo "⚡ 性能测试"
echo "==========="
echo ""

# 清理输出目录
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 测试 1: 单次转换性能
echo "📊 测试 1: 单次转换性能"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_dir="$OUTPUT_DIR/single"
mkdir -p "$test_dir"
cp "$SCRIPT_DIR/../fixtures/sample-pem/certificate.pem" "$test_dir/"
cp "$SCRIPT_DIR/../fixtures/sample-pem/private.key" "$test_dir/"

cd "$PROJECT_DIR"

echo "开始计时..."
START_TIME=$(date +%s%N)

node dist/cli.js -m pfx -d "$test_dir" -p test123 -o perf_test > /dev/null 2>&1

END_TIME=$(date +%s%N)
ELAPSED=$((($END_TIME - $START_TIME) / 1000000))

echo "完成时间: ${ELAPSED}ms"
echo ""

# 测试 2: 批量转换性能
echo "📊 测试 2: 批量转换性能 (10次)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

batch_dir="$OUTPUT_DIR/batch"
mkdir -p "$batch_dir"

echo "开始计时..."
START_TIME=$(date +%s%N)

for i in {1..10}; do
  test_sub="$batch_dir/test_$i"
  mkdir -p "$test_sub"
  cp "$SCRIPT_DIR/../fixtures/sample-pem/certificate.pem" "$test_sub/"
  cp "$SCRIPT_DIR/../fixtures/sample-pem/private.key" "$test_sub/"
  
  node dist/cli.js -m pfx -d "$test_sub" -p test123 -o batch_$i > /dev/null 2>&1
done

END_TIME=$(date +%s%N)
ELAPSED=$((($END_TIME - $START_TIME) / 1000000))
AVG=$((ELAPSED / 10))

echo "总时间: ${ELAPSED}ms"
echo "平均时间: ${AVG}ms"
echo ""

# 测试 3: 不同格式转换性能对比
echo "📊 测试 3: 格式转换性能对比"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

formats=("pfx" "pem" "crt")

for format in "${formats[@]}"; do
  format_dir="$OUTPUT_DIR/format_$format"
  mkdir -p "$format_dir"
  
  # 准备不同的输入文件
  case $format in
    pfx)
      cp "$SCRIPT_DIR/../fixtures/sample-pem/certificate.pem" "$format_dir/"
      cp "$SCRIPT_DIR/../fixtures/sample-pem/private.key" "$format_dir/"
      ;;
    pem)
      cp "$SCRIPT_DIR/../fixtures/sample-pfx/certificate.pfx" "$format_dir/"
      ;;
    crt)
      cp "$SCRIPT_DIR/../fixtures/sample-pem/certificate.pem" "$format_dir/"
      cp "$SCRIPT_DIR/../fixtures/sample-pem/private.key" "$format_dir/"
      ;;
  esac
  
  START_TIME=$(date +%s%N)
  node dist/cli.js -m "$format" -d "$format_dir" -p test123456 -o "format_$format" > /dev/null 2>&1
  END_TIME=$(date +%s%N)
  ELAPSED=$((($END_TIME - $START_TIME) / 1000000))
  
  echo "$format 转换: ${ELAPSED}ms"
done

echo ""

# 测试 4: 文件大小对性能的影响
echo "📊 测试 4: 文件大小影响（使用相同证书）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

size_dir="$OUTPUT_DIR/size_test"
mkdir -p "$size_dir"
cp "$SCRIPT_DIR/../fixtures/sample-pem/certificate.pem" "$size_dir/"
cp "$SCRIPT_DIR/../fixtures/sample-pem/private.key" "$size_dir/"

PEM_SIZE=$(stat -f%z "$size_dir/certificate.pem" 2>/dev/null || stat -c%s "$size_dir/certificate.pem")
KEY_SIZE=$(stat -f%z "$size_dir/private.key" 2>/dev/null || stat -c%s "$size_dir/private.key")

echo "PEM 大小: ${PEM_SIZE} bytes"
echo "KEY 大小: ${KEY_SIZE} bytes"

START_TIME=$(date +%s%N)
node dist/cli.js -m pfx -d "$size_dir" -p test123 -o size_test > /dev/null 2>&1
END_TIME=$(date +%s%N)
ELAPSED=$((($END_TIME - $START_TIME) / 1000000))

if [ -f "$size_dir/size_test.pfx" ]; then
  PFX_SIZE=$(stat -f%z "$size_dir/size_test.pfx" 2>/dev/null || stat -c%s "$size_dir/size_test.pfx")
  echo "生成的 PFX 大小: ${PFX_SIZE} bytes"
fi

echo "转换时间: ${ELAPSED}ms"
echo ""

# 清理
echo "🧹 清理测试文件..."
rm -rf "$OUTPUT_DIR"

echo ""
echo "✅ 性能测试完成！"
echo ""
echo "💡 提示："
echo "   - 单次转换通常在 100-500ms 之间"
echo "   - 批量转换受 I/O 和 OpenSSL 性能影响"
echo "   - 实际性能取决于系统配置和证书大小"
