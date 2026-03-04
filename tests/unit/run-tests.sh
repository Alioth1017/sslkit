#!/bin/bash

# 运行所有单元测试

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 确保项目已构建
if [ ! -f "$PROJECT_DIR/dist/library.umd.js" ]; then
  echo "⚠️  项目未构建，正在构建..."
  cd "$PROJECT_DIR" && pnpm build
fi

cd "$SCRIPT_DIR"
node --test *.test.js
