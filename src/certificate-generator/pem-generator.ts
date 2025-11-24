import * as path from "path";
import * as fs from "fs/promises";
import { execCommand, logError } from "../utils";
import { CertificateGeneratorBase } from "./base";

export class PemCertificateGenerator extends CertificateGeneratorBase {
  /**
   * 生成 PEM 文件。支持从 PFX、CRT/CER 转换，或提取现有 KEY 文件。
   */
  async generate() {
    try {
      const files = await this.getFilesInfo(this.directory);
      const keyFile = await this.findKeyFile(files);
      let pemFile = await this.findPemFile(files);

      // 如果已有 PEM 文件，直接使用
      if (pemFile) {
        console.log(`已找到现有 PEM 文件: ${pemFile}`);

        // 如果有 KEY 文件，将它们组合输出
        if (keyFile) {
          await this.combinePemAndKey(pemFile, keyFile);
        } else {
          console.log(`仅找到 PEM 文件，未找到私钥文件。`);
        }
        return;
      }

      // 尝试从 PFX 转换
      const pfxFile = files.find((f) => f.isFile && f.fileExtension === ".pfx");
      if (pfxFile) {
        await this.generatePemFromPfx(pfxFile.filePath);
        return;
      }

      // 尝试从 CRT/CER 转换
      const crtOrCerFile = await this.findCrtOrCerFile(files);
      if (crtOrCerFile) {
        pemFile = await this.convertCrtOrCerToPem(crtOrCerFile);
        console.log(`已将证书文件 ${crtOrCerFile} 转换为 PEM: ${pemFile}`);

        if (keyFile) {
          await this.combinePemAndKey(pemFile, keyFile);
        }
        return;
      }

      logError("未找到可用的证书文件（PFX、PEM 或 CRT/CER）。");
    } catch (err) {
      logError(`生成 PEM 失败: ${(err as Error).message}`);
    }
  }

  /**
   * 从 PFX 文件生成 PEM 和 KEY 文件
   */
  private async generatePemFromPfx(pfxFile: string) {
    const certOutput = path.join(this.directory, this.outputFileName + ".pem");
    const keyOutput = path.join(this.directory, this.outputFileName + ".key");

    try {
      console.log(`从 PFX 文件提取证书和私钥: ${pfxFile}`);

      // 提取证书（不包含私钥）
      const certCommand = `${this.opensslPath} pkcs12 -in "${pfxFile}" -clcerts -nokeys -out "${certOutput}" -passin pass:${this.exportPassword}`;
      await execCommand(certCommand);

      // 提取私钥（无加密）
      const keyCommand = `${this.opensslPath} pkcs12 -in "${pfxFile}" -nocerts -nodes -out "${keyOutput}" -passin pass:${this.exportPassword}`;
      await execCommand(keyCommand);

      console.log("\n✅ PEM 证书生成成功!");
      console.log(`📁 证书文件: ${certOutput}`);
      console.log(`🔑 私钥文件: ${keyOutput}`);
      console.log(
        `\n💡 Nginx 配置示例:\n   ssl_certificate ${certOutput};\n   ssl_certificate_key ${keyOutput};`
      );
    } catch (error) {
      logError(`从 PFX 生成 PEM 过程出错: ${(error as Error).message}`);
    }
  }

  /**
   * 将 PEM 证书和 KEY 文件合并到单个文件
   */
  private async combinePemAndKey(pemFile: string, keyFile: string) {
    const combinedOutput = path.join(
      this.directory,
      this.outputFileName + "_combined.pem"
    );

    try {
      const pemContent = await fs.readFile(pemFile, "utf8");
      const keyContent = await fs.readFile(keyFile, "utf8");
      const combined = keyContent + "\n" + pemContent;

      await fs.writeFile(combinedOutput, combined);
      console.log(`已生成合并的 PEM 文件（包含证书和私钥）: ${combinedOutput}`);
    } catch (error) {
      logError(`合并 PEM 和 KEY 文件失败: ${(error as Error).message}`);
    }
  }
}
