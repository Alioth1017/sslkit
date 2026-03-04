#!/bin/bash

# 运行所有集成测试

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 SSLKit 集成测试"
echo ""

# 确保项目已构建
if [ ! -f "$PROJECT_DIR/dist/cli.js" ]; then
  echo "⚠  项目未构建，正在构建..."
  cd "$PROJECT_DIR"
  pnpm build
  echo ""
fi

# 准备测试证书
if [ ! -f "$SCRIPT_DIR/fixtures/sample-pem/certificate.pem" ]; then
  echo "生成测试证书..."
  cd "$SCRIPT_DIR/fixtures"
  chmod +x generate-test-certs.sh
  ./generate-test-certs.sh > /dev/null
fi

TOTAL=0
PASSED=0
FAILED=0

run_test() {
  local name=$1
  local script=$2
  TOTAL=$((TOTAL + 1))
  chmod +x "$script"
  # 捕获输出；失败时打印详情
  local output
  output=$(VERBOSE=0 "$script" 2>&1) && {
    # 透传子脚本的简洁行（缩进 2 空格的 ✓/✗ 行）
    echo "$output" | grep -E "^\s+[✓✗]" || true
    echo "  ✅ $name"
    PASSED=$((PASSED + 1))
  } || {
    echo "  ❌ $name"
    echo "$output" | sed 's/^/    /'
    FAILED=$((FAILED + 1))
  }
}

cd "$SCRIPT_DIR/integration"

run_test "PFX 生成" "./test-pfx.sh"
run_test "PEM 生成" "./test-pem.sh"
run_test "CRT 生成" "./test-crt.sh"
run_test "JKS 生成" "./test-jks.sh"
run_test "边缘案例" "./test-edge-cases.sh"

# 性能测试（可选）
echo ""
read -p "运行性能测试? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  run_test "性能" "./test-performance.sh"
fi

echo ""
echo "通过 $PASSED/$TOTAL"

[ $FAILED -eq 0 ] && echo "🎉 全部通过" && exit 0 || echo "⚠  $FAILED 个失败" && exit 1
