/**
 * 单元测试 - 验证器
 * 运行: node --test tests/unit/validator.test.js
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { Validator } = require("../../dist/library.umd.js");

describe("Validator", () => {
  describe("validateMode", () => {
    it("应该接受有效的模式", () => {
      for (const mode of ["pem", "pfx", "crt", "jks", "all"]) {
        assert.ok(Validator.validateMode(mode), `${mode} 应该是有效的`);
      }
    });

    it("应该拒绝无效的模式", () => {
      assert.ok(!Validator.validateMode("invalid"), "无效模式应该被拒绝");
      assert.ok(!Validator.validateMode(""),        "空字符串应该被拒绝");
      assert.ok(!Validator.validateMode("PEM"),     "大写 PEM 应该被拒绝");
      assert.ok(!Validator.validateMode("ALL"),     "大写 ALL 应该被拒绝");
    });
  });

  describe("validatePassword", () => {
    it("应该验证密码强度", () => {
      assert.ok( Validator.validatePassword("12345678"), "8位密码应该通过");
      assert.ok( Validator.validatePassword("test123"),  "7位密码应该通过");
      assert.ok(!Validator.validatePassword("123"),      "短密码应该失败");
      assert.ok(!Validator.validatePassword(""),         "空密码应该失败");
    });
  });

  describe("checkDirectory", () => {
    it("应该验证现有目录", async () => {
      const result = await Validator.checkDirectory(path.join(__dirname, "../fixtures"));
      assert.ok(result, "存在的目录应该验证通过");
    });

    it("应该拒绝不存在的目录", async () => {
      const result = await Validator.checkDirectory("/nonexistent/directory");
      assert.ok(!result, "不存在的目录应该验证失败");
    });
  });

  describe("checkOpenSSL", () => {
    it("应该检测 OpenSSL（结果取决于系统环境）", async () => {
      const result = await Validator.checkOpenSSL("openssl");
      assert.ok(typeof result === "boolean", "应返回布尔值");
    });
  });
});
