import * as fs from "fs/promises";
import * as path from "path";
import { CertificateGeneratorBase } from "./certificate-generator/base";
import { CrtCertificateGenerator } from "./certificate-generator/crt-generator";
import { JksCertificateGenerator } from "./certificate-generator/jks-generator";
import { PemCertificateGenerator } from "./certificate-generator/pem-generator";
import { PfxCertificateGenerator } from "./certificate-generator/pfx-generator";
import { Validator } from "./validator";

export { Validator } from "./validator";
export {
  execPromise,
  execCommand,
  logError,
  logSuccess,
  logWarning,
  logInfo,
  formatFileSize,
  getFileInfo,
  safeUnlink,
} from "./utils";

export type CertificateGeneratorMode = "pem" | "pfx" | "crt" | "jks" | "all";
export interface Options {
  // Nginx   pem/key
  // Tomcat  pfx
  // Apache  crt/key
  // IIS     pfx
  // JKS     jks
  // 其他     pem/key
  // 根证书   crt/cer
  mode: CertificateGeneratorMode;
  directory: string;
  exportPassword: string;
  outputFileName?: string;
  opensslPath?: string;
  skipValidation?: boolean; // 跳过验证（仅用于测试）
}

export class CertificateGenerator {
  private mode: CertificateGeneratorMode;
  private directory: string;
  private exportPassword: string;
  private outputFileName: string;
  private opensslPath: string;
  private skipValidation: boolean;

  constructor(options: Options) {
    this.directory = options.directory;
    this.exportPassword = options.exportPassword;
    this.outputFileName = options.outputFileName || "certificate";
    this.opensslPath = options.opensslPath || "openssl";
    this.mode = options.mode || "pfx";
    this.skipValidation = options.skipValidation || false;
  }

  async execute() {
    try {
      if (this.mode === "all") {
        await this.executeAll();
        return;
      }

      // 执行预检查
      if (!this.skipValidation) {
        const isValid = await Validator.preflightCheck(
          this.mode,
          this.directory,
          this.opensslPath,
          this.exportPassword
        );
        if (!isValid) {
          console.error("预检查失败，终止操作。");
          return;
        }

        // 检查输出文件是否已存在（仅警告，不中断）
        const modeExtMap: Record<string, string> = {
          pfx: ".pfx",
          pem: ".pem",
          crt: ".crt",
          jks: ".jks",
        };
        const ext = modeExtMap[this.mode];
        if (ext) {
          await Validator.checkOutputFileExists(
            this.directory,
            this.outputFileName,
            ext
          );
        }
      }

      let generator = this.getGenerator();
      await generator.generate();
    } catch (error) {
      console.error("生成证书时发生错误:", error);
    }
  }

  /**
   * 遍历所有模式（pem/pfx/crt/jks），依次在对应子目录中生成证书。
   * 每种模式的输出目录为 `{directory}/{mode}/`。
   * 单个模式失败不影响其他模式的执行。
   */
  /**
   * 每种模式生成时需要从源目录复制的文件扩展名。
   * 只复制对应生成器实际需要的源文件，生成完毕后再清理掉这些临时副本，
   * 使每个子目录只保留该模式对应的输出文件。
   *
   * - pem : 从 PFX 提取，或合并 PEM+KEY，或由 CRT/CER 转换
   * - pfx : 需要 KEY + PEM/CRT/CER
   * - crt : 需要 PEM 或 PFX
   * - jks : 需要 PFX，或 PEM+KEY
   */
  private static readonly MODE_SRC_EXTS: Record<
    "pem" | "pfx" | "crt" | "jks",
    string[]
  > = {
    pem: [".pfx", ".p12", ".pem", ".key", ".crt", ".cer", ".txt"],
    pfx: [".pem", ".key", ".crt", ".cer", ".txt"],
    crt: [".pem", ".pfx", ".p12", ".key", ".txt"],
    jks: [".pfx", ".p12", ".pem", ".key", ".txt"],
  };

  private async executeAll() {
    const modes: Array<"pem" | "pfx" | "crt" | "jks"> = ["pem", "pfx", "crt", "jks"];

    // 共用预检查（不含模式验证）
    if (!this.skipValidation) {
      const opensslOk = await Validator.checkOpenSSL(this.opensslPath);
      if (!opensslOk) {
        console.error("OpenSSL 不可用，终止操作。");
        return;
      }
      const dirOk = await Validator.checkDirectory(this.directory);
      if (!dirOk) {
        console.error("目录检查失败，终止操作。");
        return;
      }
    }

    // 读取源目录中所有文件（供各模式按需筛选）
    let allSrcFiles: string[] = [];
    try {
      const entries = await fs.readdir(this.directory);
      // 只取文件，排除子目录
      const stats = await Promise.all(
        entries.map(async (f) => ({
          name: f,
          stat: await fs.stat(path.join(this.directory, f)),
        }))
      );
      allSrcFiles = stats.filter((s) => s.stat.isFile()).map((s) => s.name);
    } catch (err) {
      console.error(`读取源目录失败: ${(err as Error).message}`);
      return;
    }

    console.log(`\n📂 源目录: ${this.directory}`);
    console.log(`📋 将依次生成模式: ${modes.join(", ")}\n`);

    const results: Record<string, "success" | "failed" | "skipped"> = {};

    for (const mode of modes) {
      const modeDir = path.join(this.directory, mode);
      console.log(`${"-".repeat(50)}`);
      console.log(`🔄 模式: ${mode.toUpperCase()}  =>  ${modeDir}`);
      console.log(`${"-".repeat(50)}`);

      try {
        // 创建子目录
        await fs.mkdir(modeDir, { recursive: true });

        // 只复制该模式需要的源文件扩展名
        const allowedExts = CertificateGenerator.MODE_SRC_EXTS[mode];
        const filesToCopy = allSrcFiles.filter((f) =>
          allowedExts.includes(path.extname(f).toLowerCase())
        );
        for (const file of filesToCopy) {
          await fs.copyFile(
            path.join(this.directory, file),
            path.join(modeDir, file)
          );
        }

        // JKS 模式额外检查 keytool
        if (mode === "jks" && !this.skipValidation) {
          const keytoolOk = await Validator.checkKeytool();
          if (!keytoolOk) {
            console.warn("⚠️  JKS 模式跳过：keytool 不可用。");
            // 清理已复制的源文件
            for (const file of filesToCopy) {
              await fs.unlink(path.join(modeDir, file)).catch(() => {});
            }
            results[mode] = "skipped";
            continue;
          }
        }

        const generator = this.createGenerator(mode, modeDir);
        await generator.generate();

        // 生成完毕后删除复制进来的源文件，只保留输出产物。
        // 对于 pem/crt 模式，私钥文件是必要的输出内容，需要保留。
        for (const file of filesToCopy) {
          const filePath = path.join(modeDir, file);
          const retain = await this.shouldRetainFileInOutput(mode, filePath);
          if (!retain) {
            await fs.unlink(filePath).catch(() => {});
          }
        }

        results[mode] = "success";
      } catch (err) {
        console.error(`❌ ${mode} 模式生成失败: ${(err as Error).message}`);
        results[mode] = "failed";
      }

      console.log("");
    }

    // 汇总
    console.log(`${"-".repeat(50)}`);
    console.log("📊 生成结果汇总:");
    for (const [mode, status] of Object.entries(results)) {
      const icon = status === "success" ? "✅" : status === "skipped" ? "⚠️ " : "❌";
      const dir = path.join(this.directory, mode);
      console.log(`  ${icon} ${mode.toUpperCase().padEnd(4)}  =>  ${dir}`);
    }
    console.log(`${"-".repeat(50)}\n`);
  }

  /**
   * 判断某个从源目录复制过来的文件在生成完毕后是否应当保留在目标子目录中。
   *
   * - pem / crt 模式：私钥文件（.key 扩展名，或 .pem 文件内容含私钥块）是必要的输出内容，需要保留。
   * - pfx / jks 模式：私钥已内嵌于产物文件中，源文件均可清除。
   */
  private async shouldRetainFileInOutput(
    mode: string,
    filePath: string
  ): Promise<boolean> {
    // 只有 pem 和 crt 模式的输出目录需要保留私钥文件
    if (mode !== "pem" && mode !== "crt") return false;

    const ext = path.extname(filePath).toLowerCase();

    // .key 扩展名直接保留
    if (ext === ".key") return true;

    // 对于 .pem 文件，检查内容是否包含私钥块（如 privkey.pem）
    if (ext === ".pem") {
      try {
        const content = await fs.readFile(filePath, "utf8");
        if (/-+\s*BEGIN\s+[A-Z ]*PRIVATE KEY\s*-+/.test(content)) return true;
      } catch {
        // 读取失败则不保留
      }
    }

    return false;
  }

  /** 根据指定的 mode 和目录创建对应的生成器（供 executeAll 使用） */
  private createGenerator(
    mode: "pem" | "pfx" | "crt" | "jks",
    directory: string
  ): CertificateGeneratorBase {
    switch (mode) {
      case "pfx":
        return new PfxCertificateGenerator(
          directory,
          this.outputFileName,
          this.exportPassword,
          this.opensslPath
        );
      case "pem":
        return new PemCertificateGenerator(
          directory,
          this.outputFileName,
          this.exportPassword,
          this.opensslPath
        );
      case "crt":
        return new CrtCertificateGenerator(
          directory,
          this.outputFileName,
          this.exportPassword,
          this.opensslPath
        );
      case "jks":
        return new JksCertificateGenerator(
          directory,
          this.outputFileName,
          this.exportPassword,
          this.opensslPath
        );
      default:
        throw new Error(`Unsupported mode: ${mode}`);
    }
  }

  private getGenerator() {
    let generator: CertificateGeneratorBase;
    switch (this.mode) {
      case "pfx":
        generator = new PfxCertificateGenerator(
          this.directory,
          this.outputFileName,
          this.exportPassword,
          this.opensslPath
        );
        break;
      case "pem":
        generator = new PemCertificateGenerator(
          this.directory,
          this.outputFileName,
          this.exportPassword,
          this.opensslPath
        );
        break;
      case "crt":
        generator = new CrtCertificateGenerator(
          this.directory,
          this.outputFileName,
          this.exportPassword,
          this.opensslPath
        );
        break;
      case "jks":
        generator = new JksCertificateGenerator(
          this.directory,
          this.outputFileName,
          this.exportPassword,
          this.opensslPath
        );
        break;
      default:
        throw new Error(`Unsupported mode: ${this.mode}`);
    }
    return generator;
  }
}
