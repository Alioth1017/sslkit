/**
 * 单元测试 - 工具函数
 * 运行: node --test tests/unit/utils.test.js
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const utils = require("../../dist/library.umd.js");

describe("Utils", () => {
  if (utils.formatFileSize) {
    describe("formatFileSize", () => {
      it("应该格式化字节为 B", () => {
        assert.equal(utils.formatFileSize(100), "100 B");
        assert.equal(utils.formatFileSize(512), "512 B");
      });

      it("应该格式化字节为 KB", () => {
        assert.ok(utils.formatFileSize(1024).includes("KB"));
      });

      it("应该格式化字节为 MB", () => {
        assert.ok(utils.formatFileSize(1024 * 1024).includes("MB"));
      });
    });
  }

  it("execPromise 应该被导出", () => {
    assert.notEqual(utils.execPromise, undefined);
  });

  it("日志函数应该被导出", () => {
    assert.equal(typeof utils.logError,   "function");
    assert.equal(typeof utils.logSuccess, "function");
    assert.equal(typeof utils.logWarning, "function");
    assert.equal(typeof utils.logInfo,    "function");
  });
});
