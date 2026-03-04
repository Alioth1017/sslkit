#!/bin/bash
# 边缘案例测试 - 测试各种特殊情况

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

OUTPUT_DIR="$OUTPUT_BASE/edge-cases"

echo "🧪 边缘案例测试"

setup_output_dir "$OUTPUT_DIR"

PASSED=0
FAILED=0

# 测试函数
run_edge_case() {
  local test_name=$1
  local test_fn=$2
  if $test_fn > /dev/null 2>&1; then
    echo "  ✓ $test_name"
    PASSED=$((PASSED + 1))
  else
    echo "  ✗ $test_name"
    FAILED=$((FAILED + 1))
  fi
}

# 测试 1: 空目录
test_empty_directory() {
  local test_dir="$OUTPUT_DIR/empty"
  mkdir -p "$test_dir"
  
  # 应该报错但不崩溃
  if run_sslkit_output -m pfx -d "$test_dir" | grep -q "未找到"; then
    return 0
  else
    return 1
  fi
}

# 测试 2: 不存在的目录
test_nonexistent_directory() {
  # 应该报错但不崩溃
  if run_sslkit_output -m pfx -d "/nonexistent/path" | grep -q "错误\|无法"; then
    return 0
  else
    return 1
  fi
}

# 测试 3: 无效的模式
test_invalid_mode() {
  if run_sslkit_output -m invalid -d "." | grep -q "无效\|错误"; then
    return 0
  else
    return 1
  fi
}

# 测试 4: 特殊字符的密码
test_special_characters_password() {
  local test_dir="$OUTPUT_DIR/special-pass"
  mkdir -p "$test_dir"
  cp "$FIXTURES_DIR/sample-pem/certificate.pem" "$test_dir/"
  cp "$FIXTURES_DIR/sample-pem/private.key" "$test_dir/"
  
  # 测试特殊字符密码
  if run_sslkit_output -m pfx -d "$test_dir" -p 'P@ss!123#$' -o special; then
    if [ -f "$test_dir/special.pfx" ]; then
      return 0
    fi
  fi
  return 1
}

# 测试 5: 长文件名
test_long_filename() {
  local test_dir="$OUTPUT_DIR/long-name"
  mkdir -p "$test_dir"
  cp "$FIXTURES_DIR/sample-pem/certificate.pem" "$test_dir/"
  cp "$FIXTURES_DIR/sample-pem/private.key" "$test_dir/"
  
  local long_name="very_long_certificate_name_with_many_characters_to_test_edge_case"
  
  if run_sslkit_output -m pfx -d "$test_dir" -p test123 -o "$long_name"; then
    if [ -f "$test_dir/${long_name}.pfx" ]; then
      return 0
    fi
  fi
  return 1
}

# 测试 6: 只有 KEY 没有 PEM
test_key_only() {
  local test_dir="$OUTPUT_DIR/key-only"
  mkdir -p "$test_dir"
  cp "$FIXTURES_DIR/sample-pem/private.key" "$test_dir/"
  
  # 应该报错
  if run_sslkit_output -m pfx -d "$test_dir" | grep -q "未找到.*PEM"; then
    return 0
  else
    return 1
  fi
}

# 测试 7: 只有 PEM 没有 KEY
test_pem_only() {
  local test_dir="$OUTPUT_DIR/pem-only"
  mkdir -p "$test_dir"
  cp "$FIXTURES_DIR/sample-pem/certificate.pem" "$test_dir/"
  
  # 应该报错
  if run_sslkit_output -m pfx -d "$test_dir" | grep -q "未找到.*key\|私钥"; then
    return 0
  else
    return 1
  fi
}

# 测试 8: 文件已存在（覆盖）
test_file_exists() {
  local test_dir="$OUTPUT_DIR/exists"
  mkdir -p "$test_dir"
  cp "$FIXTURES_DIR/sample-pem/certificate.pem" "$test_dir/"
  cp "$FIXTURES_DIR/sample-pem/private.key" "$test_dir/"
  
  # 第一次生成
  run_sslkit_output -m pfx -d "$test_dir" -p test123 -o exist_test > /dev/null
  
  # 第二次生成（应该覆盖并警告）
  if run_sslkit_output -m pfx -d "$test_dir" -p test123 -o exist_test | grep -q "警告\|已存在"; then
    if [ -f "$test_dir/exist_test.pfx" ]; then
      return 0
    fi
  fi
  return 1
}

# 运行所有边缘案例测试
run_edge_case "空目录处理" test_empty_directory
run_edge_case "不存在的目录" test_nonexistent_directory
run_edge_case "无效的模式" test_invalid_mode
run_edge_case "特殊字符密码" test_special_characters_password
run_edge_case "长文件名" test_long_filename
run_edge_case "仅有 KEY 文件" test_key_only
run_edge_case "仅有 PEM 文件" test_pem_only
run_edge_case "文件已存在" test_file_exists

# 总结
echo ""
echo "边缘案例: 通过 $PASSED 个，失败 $FAILED 个"

rm -rf "$OUTPUT_DIR"

[ $FAILED -eq 0 ] && exit 0 || exit 1
