import * as path from "path";
import * as fs from "fs/promises";
import {
  execCommand,
  logError,
  logInfo,
  logSuccess,
  safeUnlink,
} from "../utils.ts";
import type { FileInfo } from "./base.ts";
import { CertificateGeneratorBase } from "./base.ts";

export class CrtCertificateGenerator extends CertificateGeneratorBase {
  /**
   * 生成 CRT 文件。支持从 PEM、PFX 等格式转换为 CRT。
   * 若目录中不存在 RSA 私钥（PKCS#1：BEGIN RSA PRIVATE KEY），则自动生成一个。
   */
  async generate(): Promise<void> {
    try {
      const files = await this.getFilesInfo(this.directory);
      await this.updateExportPassword(files);
      const pemFile = await this.resolvePemFile(files);
      const keyFile = await this.resolveKeyFile(files);
      await this.generateCrt(pemFile, keyFile);
    } catch (err) {
      logError(`生成 CRT 失败: ${(err as Error).message}`);
    }
  }

  /** 获取 PEM 文件，优先查找 .pem，其次尝试从 PFX 提取 */
  private async resolvePemFile(files: FileInfo[]): Promise<string> {
    let pemFile = await this.findPemFile(files);
    if (!pemFile) {
      const pfx = files.find((f) => f.isFile && f.fileExtension === ".pfx");
      if (pfx) {
        pemFile = await this.extractCertFromPfx(pfx.filePath);
      }
    }
    if (!pemFile) {
      throw new Error("未找到 PEM 或 PFX 证书文件，无法生成 CRT。");
    }
    return pemFile;
  }

  /** 获取私钥文件，自动处理格式转换和生成 */
  private async resolveKeyFile(files: FileInfo[]): Promise<string | null> {
    // 查找私钥文件
    const keyFile = await this.findKeyFile(files);
    if (keyFile) {
      return keyFile;
    }

    // 从 PFX 提取私钥
    const pfx = files.find((f) => f.isFile && f.fileExtension === ".pfx");
    if (pfx) {
      try {
        return await this.extractKeyFromPfx(pfx.filePath);
      } catch (e) {
        logError(`从 PFX 提取私钥失败: ${(e as Error).message}`);
      }
    }

    // 未检测到私钥则返回 null
    return null;
  }
  /** 将 PEM 转为 CRT（扩展名变化，内容同 PEM） */
  private async generateCrt(
    pemFile: string,
    keyFile: string | null
  ): Promise<void> {
    const crtOutput = path.join(this.directory, this.outputFileName + ".crt");
    try {
      logInfo(`生成 CRT 文件从 PEM: ${pemFile}`);
      const crtCommand = `${this.opensslPath} x509 -in "${pemFile}" -out "${crtOutput}" -outform PEM`;
      await execCommand(crtCommand);

      // 清理临时 PEM 文件（如果是从 PFX 提取的）
      if (pemFile.includes("_temp.pem")) {
        await safeUnlink(pemFile);
      }

      logSuccess("CRT 证书生成成功!");
      logInfo(`📁 证书文件: ${crtOutput}`);
      logInfo(
        `\n💡 Apache 配置示例:\n   SSLCertificateFile ${crtOutput}\n   SSLCertificateKeyFile ${
          keyFile || "<your-private-key-path>"
        }`
      );
    } catch (error) {
      logError(`生成 CRT 过程出错: ${(error as Error).message}`);
      throw error;
    }
  }
}
