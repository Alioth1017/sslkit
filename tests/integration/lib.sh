#!/bin/bash
# tests/integration/lib.sh - 集成测试公共库
# 所有集成测试脚本通过 source 引入此文件
# 设置 VERBOSE=1 可输出详细信息

_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$_LIB_DIR/../.." && pwd)"
FIXTURES_DIR="$_LIB_DIR/../fixtures"
OUTPUT_BASE="$_LIB_DIR/../output"

VERBOSE=${VERBOSE:-0}

# 断言文件存在
assert_file() {
  local file=$1 msg=${2:-"文件未生成: $1"}
  if [ ! -f "$file" ]; then
    echo "  ✗ $msg"
    exit 1
  fi
}

# 断言文件包含指定字符串
assert_content() {
  local file=$1 pattern=$2 msg=${3:-"文件内容不正确: $1"}
  if ! grep -q "$pattern" "$file"; then
    echo "  ✗ $msg"
    exit 1
  fi
}

# 断言两个值相等
assert_equal() {
  local actual=$1 expected=$2 msg=${3:-"值不匹配"}
  if [ "$actual" != "$expected" ]; then
    echo "  ✗ $msg (实际: $actual, 期望: $expected)"
    exit 1
  fi
}

# 准备输出目录（清理后重建）
setup_output_dir() {
  rm -rf "$1"
  mkdir -p "$1"
}

# 运行 sslkit CLI — 默认静默，VERBOSE=1 时输出
run_sslkit() {
  cd "$PROJECT_DIR"
  if [ "$VERBOSE" = "1" ]; then
    node dist/cli.js "$@"
  else
    node dist/cli.js "$@" > /dev/null 2>&1
  fi
}

# 运行 sslkit CLI 并输出 stdout+stderr（供 grep 管道使用）
run_sslkit_output() {
  cd "$PROJECT_DIR"
  node dist/cli.js "$@" 2>&1 || true
}
