/**
 * 单元测试 - 生成内容验证
 *
 * 使用 tests/fixtures 中的真实证书作为输入，对每种模式实际生成输出文件，
 * 然后通过 openssl / keytool 命令及文件内容检查验证生成产物的正确性。
 *
 * 运行: node --test tests/unit/content-validation.test.js
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");
const os = require("os");
const { CertificateGenerator, execPromise } = require("../../dist/library.umd.js");

// ─── 常量 ────────────────────────────────────────────────────────────────────

const FIXTURES       = path.resolve(__dirname, "../fixtures");
const SAMPLE_PEM_DIR = path.join(FIXTURES, "sample-pem");
const SAMPLE_PFX_DIR = path.join(FIXTURES, "sample-pfx");

const EXPECTED_CN      = "test.example.com";
const PFX_PASSWORD     = "test123456";  // see tests/fixtures/sample-pfx/pfx-password.txt
const EXPORT_PASSWORD  = "123456";      // 从无密码 PEM 生成输出时使用的导出密码

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

async function makeTempDir() {
  return fsp.mkdtemp(path.join(os.tmpdir(), "sslkit-cv-"));
}
async function rmDir(dir) {
  await fsp.rm(dir, { recursive: true, force: true });
}
async function copyDir(srcDir, destDir) {
  await fsp.mkdir(destDir, { recursive: true });
  for (const f of await fsp.readdir(srcDir)) {
    const s = path.join(srcDir, f);
    if ((await fsp.stat(s)).isFile()) await fsp.copyFile(s, path.join(destDir, f));
  }
}
async function assertFile(filePath, minBytes = 100, label = "") {
  const stat = await fsp.stat(filePath).catch(() => null);
  assert.ok(stat, `${label || path.basename(filePath)} 文件不存在: ${filePath}`);
  assert.ok(stat.size >= minBytes, `${label || path.basename(filePath)} 大小 ${stat.size}B 过小（期望 >= ${minBytes}B）`);
}
async function readText(filePath) { return fsp.readFile(filePath, "utf8"); }
async function openssl(...args) {
  const cmd = "openssl " + args.join(" ");
  try { const { stdout, stderr } = await execPromise(cmd); return (stdout + "\n" + stderr).trim(); }
  catch (err) { return ((err.stdout || "") + "\n" + (err.stderr || err.message)).trim(); }
}
async function keytool(...args) {
  const cmd = "keytool " + args.join(" ");
  try { const { stdout, stderr } = await execPromise(cmd); return (stdout + "\n" + stderr).trim(); }
  catch (err) { return ((err.stdout || "") + "\n" + (err.stderr || err.message)).trim(); }
}
async function pfxSubject(pfxPath, password, tmpDir) {
  const verifyPem = path.join(tmpDir, `_verify_${Date.now()}.pem`);
  await openssl("pkcs12", "-in", `"${pfxPath}"`, "-nokeys", "-clcerts", "-passin", `pass:${password}`, "-out", `"${verifyPem}"`);
  return openssl("x509", "-in", `"${verifyPem}"`, "-noout", "-subject");
}
async function makePfxOnlyDir() {
  const tmpDir = await makeTempDir();
  await fsp.copyFile(path.join(SAMPLE_PFX_DIR, "certificate.pfx"), path.join(tmpDir, "certificate.pfx"));
  return tmpDir;
}

// ─── 测试套件 ────────────────────────────────────────────────────────────────

describe("生成内容验证", () => {
  // ════════════════════════════════════════════════════════════════════════════
  // 1. PFX 生成验证
  // ════════════════════════════════════════════════════════════════════════════

  describe("PFX 生成", () => {
    it("输出文件存在且非空", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        await new CertificateGenerator({ mode: "pfx", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        await assertFile(path.join(tmpDir, "out.pfx"), 500, "out.pfx");
      } finally { await rmDir(tmpDir); }
    });

    it("密码文件与设定密码一致", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        await new CertificateGenerator({ mode: "pfx", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const pw = (await readText(path.join(tmpDir, "pfx-password.txt"))).trim();
        assert.equal(pw, EXPORT_PASSWORD, `密码文件内容 "${pw}" 与预期 "${EXPORT_PASSWORD}" 不符`);
      } finally { await rmDir(tmpDir); }
    });

    it("openssl 可解析且证书 CN 正确", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        await new CertificateGenerator({ mode: "pfx", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const out = await pfxSubject(path.join(tmpDir, "out.pfx"), EXPORT_PASSWORD, tmpDir);
        assert.ok(out.includes(EXPECTED_CN), `PFX 证书 CN 应为 ${EXPECTED_CN}`);
      } finally { await rmDir(tmpDir); }
    });

    it("从 PFX 提取再重打包，证书主题不变", async () => {
      const tmpDir = await makePfxOnlyDir();
      try {
        await new CertificateGenerator({ mode: "pem", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        await assertFile(path.join(tmpDir, "out.pem"), 100, "extracted out.pem");
        await assertFile(path.join(tmpDir, "out.key"), 100, "extracted out.key");
        const tmpDir2 = await makeTempDir();
        try {
          await fsp.copyFile(path.join(tmpDir, "out.pem"), path.join(tmpDir2, "out.pem"));
          await fsp.copyFile(path.join(tmpDir, "out.key"), path.join(tmpDir2, "out.key"));
          await new CertificateGenerator({ mode: "pfx", directory: tmpDir2, exportPassword: PFX_PASSWORD, outputFileName: "repacked", skipValidation: true }).execute();
          const out = await pfxSubject(path.join(tmpDir2, "repacked.pfx"), PFX_PASSWORD, tmpDir2);
          assert.ok(out.includes(EXPECTED_CN), "重打包 PFX 的证书 CN 应与原始一致");
        } finally { await rmDir(tmpDir2); }
      } finally { await rmDir(tmpDir); }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. PEM 生成验证
  // ════════════════════════════════════════════════════════════════════════════

  describe("PEM 生成", () => {
    it(".pem 和 .key 文件存在且非空", async () => {
      const tmpDir = await makePfxOnlyDir();
      try {
        await new CertificateGenerator({ mode: "pem", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        await assertFile(path.join(tmpDir, "out.pem"), 100, "out.pem");
        await assertFile(path.join(tmpDir, "out.key"), 100, "out.key");
      } finally { await rmDir(tmpDir); }
    });

    it(".pem 文件包含 BEGIN / END CERTIFICATE 头尾", async () => {
      const tmpDir = await makePfxOnlyDir();
      try {
        await new CertificateGenerator({ mode: "pem", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const content = await readText(path.join(tmpDir, "out.pem"));
        assert.ok(content.includes("-----BEGIN CERTIFICATE-----"), ".pem 应含 BEGIN CERTIFICATE");
        assert.ok(content.includes("-----END CERTIFICATE-----"),   ".pem 应含 END CERTIFICATE");
      } finally { await rmDir(tmpDir); }
    });

    it(".key 文件包含 PRIVATE KEY 标记", async () => {
      const tmpDir = await makePfxOnlyDir();
      try {
        await new CertificateGenerator({ mode: "pem", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        assert.ok((await readText(path.join(tmpDir, "out.key"))).includes("PRIVATE KEY"), ".key 应含 PRIVATE KEY");
      } finally { await rmDir(tmpDir); }
    });

    it("证书 CN 与 fixture 一致", async () => {
      const tmpDir = await makePfxOnlyDir();
      try {
        await new CertificateGenerator({ mode: "pem", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const out = await openssl("x509", "-in", `"${path.join(tmpDir, "out.pem")}"`, "-noout", "-subject");
        assert.ok(out.includes(EXPECTED_CN), `PEM 证书 CN 应为 ${EXPECTED_CN}`);
      } finally { await rmDir(tmpDir); }
    });

    it("私钥 modulus 与证书公钥 modulus 一致（密钥对匹配）", async () => {
      const tmpDir = await makePfxOnlyDir();
      try {
        await new CertificateGenerator({ mode: "pem", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const certMod = await openssl("x509", "-in", `"${path.join(tmpDir, "out.pem")}"`, "-noout", "-modulus");
        const keyMod  = await openssl("rsa",  "-in", `"${path.join(tmpDir, "out.key")}"`, "-noout", "-modulus");
        assert.equal(certMod.trim(), keyMod.trim(), "证书公钥与私钥 modulus 不匹配，密钥对不对应");
      } finally { await rmDir(tmpDir); }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. CRT 生成验证
  // ════════════════════════════════════════════════════════════════════════════

  describe("CRT 生成", () => {
    it("输出文件存在且非空", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        await new CertificateGenerator({ mode: "crt", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        await assertFile(path.join(tmpDir, "out.crt"), 100, "out.crt");
      } finally { await rmDir(tmpDir); }
    });

    it("文件包含 BEGIN CERTIFICATE 头", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        await new CertificateGenerator({ mode: "crt", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        assert.ok((await readText(path.join(tmpDir, "out.crt"))).includes("-----BEGIN CERTIFICATE-----"), ".crt 应包含 BEGIN CERTIFICATE 头");
      } finally { await rmDir(tmpDir); }
    });

    it("证书 CN 与原始 PEM 一致", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        await new CertificateGenerator({ mode: "crt", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const out = await openssl("x509", "-in", `"${path.join(tmpDir, "out.crt")}"`, "-noout", "-subject");
        assert.ok(out.includes(EXPECTED_CN), `CRT 证书 CN 应为 ${EXPECTED_CN}`);
      } finally { await rmDir(tmpDir); }
    });

    it("有效期与原始 PEM 一致", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        await new CertificateGenerator({ mode: "crt", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const origDates = await openssl("x509", "-in", `"${path.join(SAMPLE_PEM_DIR, "certificate.pem")}"`, "-noout", "-dates");
        const crtDates  = await openssl("x509", "-in", `"${path.join(tmpDir, "out.crt")}"`, "-noout", "-dates");
        const parseDate = (str, key) => { const m = str.match(new RegExp(key + "=(.+)")); return m ? m[1].trim() : ""; };
        assert.equal(parseDate(origDates, "notBefore"), parseDate(crtDates, "notBefore"), "CRT notBefore 应与原始 PEM 一致");
        assert.equal(parseDate(origDates, "notAfter"),  parseDate(crtDates, "notAfter"),  "CRT notAfter 应与原始 PEM 一致");
      } finally { await rmDir(tmpDir); }
    });

    it("SHA1 指纹与原始 PEM 一致", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        await new CertificateGenerator({ mode: "crt", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const origFp = await openssl("x509", "-in", `"${path.join(SAMPLE_PEM_DIR, "certificate.pem")}"`, "-noout", "-fingerprint", "-sha1");
        const crtFp  = await openssl("x509", "-in", `"${path.join(tmpDir, "out.crt")}"`, "-noout", "-fingerprint", "-sha1");
        const extractFp = (s) => (s.match(/Fingerprint=([A-F0-9:]+)/i) || [])[1] || s.trim();
        assert.equal(extractFp(origFp), extractFp(crtFp), `CRT 指纹 ${extractFp(crtFp)} 应与原始 PEM 指纹 ${extractFp(origFp)} 一致`);
      } finally { await rmDir(tmpDir); }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. JKS 生成验证
  // ════════════════════════════════════════════════════════════════════════════

  describe("JKS 生成", () => {
    it("输出文件存在且非空", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PFX_DIR, tmpDir);
        await new CertificateGenerator({ mode: "jks", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        await assertFile(path.join(tmpDir, "out.jks"), 500, "out.jks");
      } finally { await rmDir(tmpDir); }
    });

    it("密码文件内容与设定密码一致", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PFX_DIR, tmpDir);
        await new CertificateGenerator({ mode: "jks", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const pw = (await readText(path.join(tmpDir, "jks-password.txt"))).trim();
        assert.equal(pw, PFX_PASSWORD, `密码文件内容 "${pw}" 与预期 "${PFX_PASSWORD}" 不符`);
      } finally { await rmDir(tmpDir); }
    });

    it("keytool 可解析且包含 1 个条目", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PFX_DIR, tmpDir);
        await new CertificateGenerator({ mode: "jks", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const out = await keytool("-list", "-v", `-keystore "${path.join(tmpDir, "out.jks")}"`, `-storepass ${PFX_PASSWORD}`, "-storetype JKS");
        assert.ok(out.includes("Your keystore contains 1 entry"), "JKS 应包含 1 个条目");
      } finally { await rmDir(tmpDir); }
    });

    it("证书 CN 与原始 PFX 一致", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PFX_DIR, tmpDir);
        await new CertificateGenerator({ mode: "jks", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const out = await keytool("-list", "-v", `-keystore "${path.join(tmpDir, "out.jks")}"`, `-storepass ${PFX_PASSWORD}`, "-storetype JKS");
        assert.ok(out.includes(EXPECTED_CN), `JKS 证书 CN 应为 ${EXPECTED_CN}`);
      } finally { await rmDir(tmpDir); }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. all 模式：各子目录输出内容验证
  // ════════════════════════════════════════════════════════════════════════════

  describe("all 模式 - 内容验证", () => {
    it("pem/ 子目录包含有效 .pem 证书文件", async () => {
      const tmpDir = await makePfxOnlyDir();
      try {
        await new CertificateGenerator({ mode: "all", directory: tmpDir, exportPassword: PFX_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const pemPath = path.join(tmpDir, "pem", "out.pem");
        await assertFile(pemPath, 100, "pem/out.pem");
        assert.ok((await readText(pemPath)).includes("-----BEGIN CERTIFICATE-----"), "pem/out.pem 应含证书头");
      } finally { await rmDir(tmpDir); }
    });

    it("pfx/ 子目录包含有效 .pfx 文件且 CN 正确", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        await new CertificateGenerator({ mode: "all", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const pfxPath = path.join(tmpDir, "pfx", "out.pfx");
        await assertFile(pfxPath, 500, "pfx/out.pfx");
        assert.ok((await pfxSubject(pfxPath, EXPORT_PASSWORD, tmpDir)).includes(EXPECTED_CN), "pfx/out.pfx 证书 CN 正确");
      } finally { await rmDir(tmpDir); }
    });

    it("crt/ 子目录包含有效 .crt 文件且 CN 正确", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        await new CertificateGenerator({ mode: "all", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        const crtPath = path.join(tmpDir, "crt", "out.crt");
        await assertFile(crtPath, 100, "crt/out.crt");
        assert.ok((await openssl("x509", "-in", `"${crtPath}"`, "-noout", "-subject")).includes(EXPECTED_CN), "crt/out.crt 证书 CN 正确");
      } finally { await rmDir(tmpDir); }
    });

    it("各子目录不残留从源目录复制来的输入文件", async () => {
      const tmpDir = await makeTempDir();
      try {
        await copyDir(SAMPLE_PEM_DIR, tmpDir);
        const srcFiles = await fsp.readdir(tmpDir);
        await new CertificateGenerator({ mode: "all", directory: tmpDir, exportPassword: EXPORT_PASSWORD, outputFileName: "out", skipValidation: true }).execute();
        for (const mode of ["pem", "pfx", "crt", "jks"]) {
          const modeDir = path.join(tmpDir, mode);
          if (!fs.existsSync(modeDir)) continue;
          const entries = await fsp.readdir(modeDir);
          for (const srcFile of srcFiles) {
            assert.ok(!entries.includes(srcFile), `${mode}/ 不应残留源文件 "${srcFile}"`);
          }
        }
      } finally { await rmDir(tmpDir); }
    });
  });
});
