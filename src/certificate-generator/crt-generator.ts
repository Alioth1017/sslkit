import * as path from "path";
import * as fs from "fs/promises";
import { execCommand, logError } from "../utils";
import { CertificateGeneratorBase } from "./base";

export class CrtCertificateGenerator extends CertificateGeneratorBase {
  /**
   * 生成 CRT 文件。支持从 PEM、PFX 等格式转换为 CRT。
   * 若目录中不存在 RSA 私钥（PKCS#1：BEGIN RSA PRIVATE KEY），则自动生成一个。
   */
  async generate(): Promise<void> {
    try {
      const files = await this.getFilesInfo(this.directory);
      let pemFile = await this.findPemFile(files);
      let keyFile = await this.findKeyFile(files);

      // 若无 PEM 尝试从 PFX 提取
      if (!pemFile) {
        const pfx = files.find((f) => f.isFile && f.fileExtension === ".pfx");
        if (pfx) {
          pemFile = await this.extractPemFromPfx(pfx.filePath);
        }
      }
      if (!pemFile) {
        logError("未找到 PEM 或 PFX 证书文件，无法生成 CRT。");
        return;
      }

      // 扫描是否已有 RSA 私钥（返回路径）
      const rsaKeyPath = await this.findRsaPrivateKey(files);
      if (!rsaKeyPath) {
        const generatedKeyPath = path.join(
          this.directory,
          this.outputFileName + ".rsa.key"
        );
        console.log(`未检测到 RSA 私钥，自动生成: ${generatedKeyPath}`);
        const genKeyCmd = `${this.opensslPath} genrsa -out "${generatedKeyPath}" 2048`;
        try {
          await execCommand(genKeyCmd);
          keyFile = generatedKeyPath; // 优先使用新生成的 RSA 私钥
        } catch (e) {
          logError(`生成 RSA 私钥失败: ${(e as Error).message}`);
        }
      } else if (!keyFile) {
        // 有 RSA 私钥但未通过 findKeyFile 找到（例如嵌在 pem 中），不强制生成，提示用户。
        console.log(
          "检测到 RSA 私钥内容但未定位独立 .key 文件，若需单独文件请手动分离。"
        );
      }

      await this.generateCrt(pemFile, keyFile || null);
    } catch (err) {
      logError(`生成 CRT 失败: ${(err as Error).message}`);
    }
  }

  /** 从 PFX 提取 PEM 证书（不含私钥） */
  private async extractPemFromPfx(pfxFile: string): Promise<string> {
    const pemOutput = path.join(
      this.directory,
      this.outputFileName + "_temp.pem"
    );
    try {
      console.log(`从 PFX 文件提取证书: ${pfxFile}`);
      const certCommand = `${this.opensslPath} pkcs12 -in "${pfxFile}" -clcerts -nokeys -out "${pemOutput}" -passin pass:${this.exportPassword}`;
      await execCommand(certCommand);
      return pemOutput;
    } catch (error) {
      throw new Error(`从 PFX 提取 PEM 失败: ${(error as Error).message}`);
    }
  }

  /** 将 PEM 转为 CRT（扩展名变化，内容同 PEM） */
  private async generateCrt(pemFile: string, keyFile: string | null) {
    const crtOutput = path.join(this.directory, this.outputFileName + ".crt");
    const chosenKeyPath =
      keyFile || path.join(this.directory, this.outputFileName + ".key");
    try {
      console.log(`生成 CRT 文件从 PEM: ${pemFile}`);
      const crtCommand = `${this.opensslPath} x509 -in "${pemFile}" -out "${crtOutput}" -outform PEM`;
      await execCommand(crtCommand);
      console.log("\n✅ CRT 证书生成成功!");
      console.log(`📁 证书文件: ${crtOutput}`);
      if (keyFile) {
        console.log(`🔑 使用的私钥: ${keyFile}`);
      } else {
        console.log(
          "⚠️  未提供或生成独立私钥文件。若需要请确保目录中存在 .key 文件。"
        );
      }
      console.log(
        `\n💡 Apache 配置示例:\n   SSLCertificateFile ${crtOutput}\n   SSLCertificateKeyFile ${
          keyFile || "<your-private-key-path>"
        }`
      );
    } catch (error) {
      logError(`生成 CRT 过程出错: ${(error as Error).message}`);
    }
  }
}
