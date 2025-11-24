import * as path from "path";
import * as fs from "fs/promises";
import { execCommand, logError } from "../utils";
import { CertificateGeneratorBase } from "./base";

export class PfxCertificateGenerator extends CertificateGeneratorBase {
  /**
   * 生成 PFX 文件。如果没有 PEM 文件但有 CRT/CER 文件，则自动转换。
   */
  async generate() {
    try {
      const files = await this.getFilesInfo(this.directory);
      const keyFile = await this.findKeyFile(files);
      let pemFile = await this.findPemFile(files);

      // 若无 PEM，自动尝试转换第一个 CRT/CER
      if (!pemFile) {
        const crtOrCerFile = await this.findCrtOrCerFile(files);
        if (crtOrCerFile) {
          try {
            pemFile = await this.convertCrtOrCerToPem(crtOrCerFile);
            console.log(`已将证书文件 ${crtOrCerFile} 转换为 PEM: ${pemFile}`);
          } catch (err) {
            logError((err as Error).message);
          }
        }
      }

      if (!keyFile) {
        logError("未找到私钥（.key）文件。");
        return;
      }
      if (!pemFile) {
        logError("未找到 PEM 文件，且无法自动转换。");
        return;
      }

      await this.generatePfx(keyFile, pemFile);
    } catch (err) {
      logError(`生成 PFX 失败: ${(err as Error).message}`);
    }
  }

  /**
   * 调用 openssl 生成 PFX 文件，并保存密码到 pfx-password.txt
   * @param keyFile 已选定的私钥路径
   * @param pemFile 已选定的 PEM 路径
   */
  private async generatePfx(keyFile: string, pemFile: string) {
    const output = path.join(this.directory, this.outputFileName + ".pfx");
    const pfxPasswordOutput = path.join(this.directory, "pfx-password.txt");
    const pfxCommand = `${this.opensslPath} pkcs12 -export -out "${output}" -inkey "${keyFile}" -in "${pemFile}" -passout pass:${this.exportPassword}`;
    try {
      console.log(`生成 PFX 时使用的 key: ${keyFile}, pem: ${pemFile}`);
      await execCommand(pfxCommand);
      await fs.writeFile(pfxPasswordOutput, this.exportPassword);
      console.log("\n✅ PFX 证书生成成功!");
      console.log(`📁 证书文件: ${output}`);
      console.log(`🔑 密码文件: ${pfxPasswordOutput}`);
      console.log(`⚠️  请妥善保管密码文件，部署时需要使用。`);
      console.log(
        `\n💡 IIS/Windows 配置提示:\n   1. 导入 PFX 文件到服务器\n   2. 在 IIS 中绑定证书到网站\n   3. 使用密码文件中的密码完成导入`
      );
    } catch (error) {
      logError(`生成 PFX 过程出错: ${(error as Error).message}`);
    }
  }
}
