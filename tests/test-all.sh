#!/bin/bash

# 运行所有集成测试

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 SSLKit 集成测试套件"
echo "======================"
echo ""

# 确保项目已构建
if [ ! -f "$PROJECT_DIR/dist/cli.js" ]; then
  echo "⚠️  项目未构建，正在构建..."
  cd "$PROJECT_DIR"
  pnpm build
  echo ""
fi

# 准备测试证书
echo "📋 准备测试证书..."
cd "$SCRIPT_DIR/fixtures"

if [ ! -f "sample-pem/certificate.pem" ]; then
  echo "生成测试证书..."
  chmod +x generate-test-certs.sh
  ./generate-test-certs.sh
fi

echo ""
echo "✅ 测试环境准备完成"
echo ""

# 统计信息
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 运行测试函数
run_test() {
  local test_name=$1
  local test_script=$2
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "测试: $test_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if chmod +x "$test_script" && "$test_script" <<< "y"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo "✅ $test_name 通过"
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo "❌ $test_name 失败"
  fi
}

# 运行所有测试
cd "$SCRIPT_DIR/integration"

run_test "PFX 生成测试" "./test-pfx.sh"
run_test "PEM 生成测试" "./test-pem.sh"
run_test "CRT 生成测试" "./test-crt.sh"
run_test "JKS 生成测试" "./test-jks.sh"
run_test "边缘案例测试" "./test-edge-cases.sh"

# 性能测试（可选）
echo ""
read -p "是否运行性能测试? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  run_test "性能测试" "./test-performance.sh"
fi

# 输出总结
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "总测试数: $TOTAL_TESTS"
echo "通过: $PASSED_TESTS"
echo "失败: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
  echo ""
  echo "🎉 所有测试通过！"
  exit 0
else
  echo ""
  echo "⚠️  有 $FAILED_TESTS 个测试失败"
  exit 1
fi
