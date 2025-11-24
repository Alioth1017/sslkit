#!/bin/bash

# 运行所有单元测试

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🧪 SSLKit 单元测试"
echo "=================="
echo ""

# 确保项目已构建
if [ ! -f "$PROJECT_DIR/dist/library.umd.js" ]; then
  echo "⚠️  项目未构建，正在构建..."
  cd "$PROJECT_DIR"
  pnpm build
  echo ""
fi

cd "$SCRIPT_DIR"

# 统计信息
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 运行测试函数
run_test() {
  local test_file=$1
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if node "$test_file"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# 运行所有测试文件
for test_file in *.test.js; do
  if [ -f "$test_file" ]; then
    run_test "$test_file"
  fi
done

# 输出总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 单元测试总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "总测试套件: $TOTAL_TESTS"
echo "通过: $PASSED_TESTS"
echo "失败: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
  echo ""
  echo "🎉 所有单元测试通过！"
  exit 0
else
  echo ""
  echo "⚠️  有 $FAILED_TESTS 个测试套件失败"
  exit 1
fi
