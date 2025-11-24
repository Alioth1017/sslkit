import * as path from "path";
import * as fs from "fs/promises";
import { execCommand, logError } from "../utils";
import { CertificateGeneratorBase } from "./base";

export class CrtCertificateGenerator extends CertificateGeneratorBase {
  /**
   * 生成 CRT 文件。支持从 PEM、PFX 等格式转换为 CRT。
   * CRT 通常用于 Apache 服务器。
   */
  async generate() {
    try {
      const files = await this.getFilesInfo(this.directory);
      let pemFile = await this.findPemFile(files);
      const keyFile = await this.findKeyFile(files);

      // 如果没有 PEM 文件，尝试从 PFX 提取
      if (!pemFile) {
        const pfxFile = files.find(
          (f) => f.isFile && f.fileExtension === ".pfx"
        );
        if (pfxFile) {
          pemFile = await this.extractPemFromPfx(pfxFile.filePath);
        }
      }

      if (!pemFile) {
        logError("未找到 PEM 文件或 PFX 文件。");
        return;
      }

      await this.generateCrt(pemFile, keyFile);
    } catch (err) {
      logError(`生成 CRT 失败: ${(err as Error).message}`);
    }
  }

  /**
   * 从 PFX 文件提取 PEM 证书
   */
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

  /**
   * 将 PEM 转换为 CRT 格式
   */
  private async generateCrt(pemFile: string, keyFile: string | null) {
    const crtOutput = path.join(this.directory, this.outputFileName + ".crt");
    const keyOutput = keyFile
      ? path.join(this.directory, path.basename(keyFile))
      : path.join(this.directory, this.outputFileName + ".key");

    try {
      console.log(`生成 CRT 文件从 PEM: ${pemFile}`);

      // PEM 转 CRT（实际上格式相同，只是扩展名不同）
      const crtCommand = `${this.opensslPath} x509 -in "${pemFile}" -out "${crtOutput}" -outform PEM`;
      await execCommand(crtCommand);

      console.log("\n✅ CRT 证书生成成功!");
      console.log(`📁 证书文件: ${crtOutput}`);

      // 如果有私钥文件，复制或提示位置
      if (keyFile) {
        const keyContent = await fs.readFile(keyFile, "utf8");
        await fs.writeFile(keyOutput, keyContent);
        console.log(`🔑 私钥文件: ${keyOutput}`);
        console.log(
          `\n💡 Apache 配置示例:\n   SSLCertificateFile ${crtOutput}\n   SSLCertificateKeyFile ${keyOutput}`
        );
      } else {
        console.log(
          `⚠️  注意: 未找到私钥文件。Apache 配置需要同时提供证书和私钥。`
        );
      }
    } catch (error) {
      logError(`生成 CRT 过程出错: ${(error as Error).message}`);
    }
  }
}
