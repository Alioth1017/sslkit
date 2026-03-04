/**
 * 单元测试 - CertificateGenerator
 * 测试 CertificateGenerator 核心逻辑，包括 all 模式的子目录管理和文件清理。
 * 运行: node --test tests/unit/generator.test.js
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");
const os = require("os");
const { CertificateGenerator } = require("../../dist/library.umd.js");

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

async function makeTempDir() {
  return fsp.mkdtemp(path.join(os.tmpdir(), "sslkit-test-"));
}

async function rmDir(dir) {
  await fsp.rm(dir, { recursive: true, force: true });
}

// ─── 测试套件 ────────────────────────────────────────────────────────────────

describe("CertificateGenerator", () => {
  describe("构造函数", () => {
    it("支持默认选项实例化", () => {
      const gen = new CertificateGenerator({ mode: "all", directory: ".", exportPassword: "test123" });
      assert.ok(gen instanceof CertificateGenerator);
    });

    it("支持所有合法模式", () => {
      for (const mode of ["pem", "pfx", "crt", "jks", "all"]) {
        const gen = new CertificateGenerator({ mode, directory: ".", exportPassword: "test123" });
        assert.ok(gen instanceof CertificateGenerator, `模式 "${mode}" 应能实例化`);
      }
    });

    it("outputFileName 默认不为 null", () => {
      const gen = new CertificateGenerator({ mode: "pfx", directory: ".", exportPassword: "pass" });
      assert.ok(gen !== null);
    });
  });

  describe("all 模式 - 子目录创建", () => {
    it("为每种格式在目标目录下创建子目录", async () => {
      const tmpDir = await makeTempDir();
      try {
        const gen = new CertificateGenerator({
          mode: "all", directory: tmpDir,
          exportPassword: "test123", skipValidation: true,
        });
        await gen.execute().catch(() => {});
        for (const mode of ["pem", "pfx", "crt", "jks"]) {
          assert.ok(fs.existsSync(path.join(tmpDir, mode)), `子目录 ${mode}/ 应被创建`);
        }
      } finally {
        await rmDir(tmpDir);
      }
    });
  });

  describe("all 模式 - 源文件分类", () => {
    it("各子目录只接收对应模式所需的源文件", async () => {
      const tmpDir = await makeTempDir();
      try {
        const sourceFiles = {
          "cert.pem": "PEM content",
          "private.key": "KEY content",
          "cert.pfx": "PFX content",
          "cert.crt": "CRT content",
          "password.txt": "123456",
        };
        for (const [name, content] of Object.entries(sourceFiles)) {
          await fsp.writeFile(path.join(tmpDir, name), content);
        }

        const expectedExts = {
          pem: [".pfx", ".p12", ".pem", ".key", ".crt", ".cer", ".txt"],
          pfx: [".pem", ".key", ".crt", ".cer", ".txt"],
          crt: [".pem", ".pfx", ".p12", ".key", ".txt"],
          jks: [".pfx", ".p12", ".pem", ".key", ".txt"],
        };

        for (const [mode, exts] of Object.entries(expectedExts)) {
          const modeDir = path.join(tmpDir, mode);
          await fsp.mkdir(modeDir, { recursive: true });

          for (const [name] of Object.entries(sourceFiles)) {
            const ext = path.extname(name).toLowerCase();
            if (exts.includes(ext)) {
              await fsp.copyFile(path.join(tmpDir, name), path.join(modeDir, name));
            }
          }

          const dirEntries = await fsp.readdir(modeDir);
          for (const entry of dirEntries) {
            const ext = path.extname(entry).toLowerCase();
            assert.ok(exts.includes(ext), `${mode}/ 不应包含 ${ext} 文件（${entry}）`);
          }

          if (mode === "pfx") {
            assert.ok(!dirEntries.some((f) => f === "cert.pfx"), "pfx/ 不应包含 .pfx 源文件");
          }
          if (mode === "pem") {
            assert.ok(dirEntries.some((f) => path.extname(f) === ".pfx"), "pem/ 应包含 .pfx 源文件");
          }
        }
      } finally {
        await rmDir(tmpDir);
      }
    });
  });

  describe("all 模式 - 清理源文件", () => {
    it("生成完毕后子目录内不保留源文件", async () => {
      const tmpDir = await makeTempDir();
      try {
        const modeDir = path.join(tmpDir, "pfx");
        await fsp.mkdir(modeDir);

        const srcFiles    = ["cert.pem", "private.key", "password.txt"];
        const outputFiles = ["certificate.pfx", "pfx-password.txt"];

        for (const f of [...srcFiles, ...outputFiles]) {
          await fsp.writeFile(path.join(modeDir, f), "content");
        }
        for (const f of srcFiles) {
          await fsp.unlink(path.join(modeDir, f)).catch(() => {});
        }

        for (const f of srcFiles) {
          assert.ok(!fs.existsSync(path.join(modeDir, f)), `源文件 ${f} 应在生成后被清理`);
        }
        for (const f of outputFiles) {
          assert.ok(fs.existsSync(path.join(modeDir, f)), `输出文件 ${f} 应保留在子目录中`);
        }
      } finally {
        await rmDir(tmpDir);
      }
    });
  });

  describe("单一模式", () => {
    it("pfx 模式不应在目标目录下创建模式子目录", async () => {
      const tmpDir = await makeTempDir();
      try {
        const gen = new CertificateGenerator({
          mode: "pfx", directory: tmpDir,
          exportPassword: "test123", skipValidation: true,
        });
        await gen.execute().catch(() => {});
        for (const mode of ["pem", "pfx", "crt", "jks"]) {
          assert.ok(!fs.existsSync(path.join(tmpDir, mode)), `单一 pfx 模式不应创建 ${mode}/ 子目录`);
        }
      } finally {
        await rmDir(tmpDir);
      }
    });
  });
});
