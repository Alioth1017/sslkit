/**
 * 单元测试 - 工具函数
 *
 * 这个文件包含了 utils 模块的单元测试
 * 运行: node tests/unit/utils.test.js
 */

const utils = require("../../dist/library.umd.js");

// 简单的测试框架
class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log(`\n🧪 测试套件: ${this.name}`);
    console.log("━".repeat(50));

    for (const test of this.tests) {
      try {
        await test.fn();
        this.passed++;
        console.log(`✅ ${test.description}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${test.description}`);
        console.log(`   错误: ${error.message}`);
      }
    }

    console.log("━".repeat(50));
    console.log(`\n📊 结果: ${this.passed} 通过, ${this.failed} 失败\n`);

    return this.failed === 0;
  }
}

// 辅助函数
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// 测试套件
const runner = new TestRunner("Utils 单元测试");

// 测试 formatFileSize
if (utils.formatFileSize) {
  runner.test("formatFileSize 应该格式化字节为 B", () => {
    assertEquals(utils.formatFileSize(100), "100 B");
    assertEquals(utils.formatFileSize(512), "512 B");
  });

  runner.test("formatFileSize 应该格式化字节为 KB", () => {
    const result = utils.formatFileSize(1024);
    assert(result.includes("KB"), `结果应该包含 KB: ${result}`);
  });

  runner.test("formatFileSize 应该格式化字节为 MB", () => {
    const result = utils.formatFileSize(1024 * 1024);
    assert(result.includes("MB"), `结果应该包含 MB: ${result}`);
  });
}

// 测试 execPromise
runner.test("execPromise 应该存在", () => {
  assert(utils.execPromise !== undefined, "execPromise 应该被导出");
});

// 测试日志函数
runner.test("日志函数应该被导出", () => {
  assert(typeof utils.logError === "function", "logError 应该是函数");
  assert(typeof utils.logSuccess === "function", "logSuccess 应该是函数");
  assert(typeof utils.logWarning === "function", "logWarning 应该是函数");
  assert(typeof utils.logInfo === "function", "logInfo 应该是函数");
});

// 运行测试
runner.run().then((success) => {
  process.exit(success ? 0 : 1);
});
