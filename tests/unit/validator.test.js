/**
 * 单元测试 - 验证器
 *
 * 这个文件包含了 Validator 类的单元测试
 * 运行: node tests/unit/validator.test.js
 */

const { Validator } = require("../../dist/library.umd.js");
const fs = require("fs");
const path = require("path");

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
const runner = new TestRunner("Validator 单元测试");

// 测试 validateMode
runner.test("validateMode 应该接受有效的模式", () => {
  assert(Validator.validateMode("pem"), "pem 应该是有效的");
  assert(Validator.validateMode("pfx"), "pfx 应该是有效的");
  assert(Validator.validateMode("crt"), "crt 应该是有效的");
  assert(Validator.validateMode("jks"), "jks 应该是有效的");
});

runner.test("validateMode 应该拒绝无效的模式", () => {
  assert(!Validator.validateMode("invalid"), "无效模式应该被拒绝");
  assert(!Validator.validateMode(""), "空字符串应该被拒绝");
  assert(!Validator.validateMode("PEM"), "大写应该被拒绝");
});

// 测试 validatePassword
runner.test("validatePassword 应该验证密码强度", () => {
  assert(Validator.validatePassword("12345678"), "8位密码应该通过");
  assert(Validator.validatePassword("test123"), "7位密码应该通过");
  assert(!Validator.validatePassword("123"), "短密码应该失败");
  assert(!Validator.validatePassword(""), "空密码应该失败");
});

// 测试 checkDirectory
runner.test("checkDirectory 应该验证现有目录", async () => {
  const testDir = path.join(__dirname, "../fixtures");
  const result = await Validator.checkDirectory(testDir);
  assert(result, "存在的目录应该验证通过");
});

runner.test("checkDirectory 应该拒绝不存在的目录", async () => {
  const result = await Validator.checkDirectory("/nonexistent/directory");
  assert(!result, "不存在的目录应该验证失败");
});

// 测试 checkOpenSSL
runner.test("checkOpenSSL 应该检测 OpenSSL", async () => {
  const result = await Validator.checkOpenSSL("openssl");
  // 这个测试取决于系统是否安装了 OpenSSL
  console.log(`   OpenSSL 可用: ${result}`);
});

// 运行测试
runner.run().then((success) => {
  process.exit(success ? 0 : 1);
});
