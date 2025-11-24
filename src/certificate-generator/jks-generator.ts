import * as path from "path";
import * as fs from "fs/promises";
import { execCommand, logError } from "../utils";
import { CertificateGeneratorBase } from "./base";

export class JksCertificateGenerator extends CertificateGeneratorBase {
  /**
   * 生成 JKS 文件。JKS (Java KeyStore) 主要用于 Java 应用程序和 Tomcat。
   * 转换流程: PFX -> P12 -> JKS (使用 keytool)
   */
  async generate() {
    try {
      const files = await this.getFilesInfo(this.directory);
      let pfxFile = files.find((f) => f.isFile && f.fileExtension === ".pfx");

      // 如果没有 PFX，尝试从 PEM + KEY 创建
      if (!pfxFile) {
        const pemFile = await this.findPemFile(files);
        const keyFile = await this.findKeyFile(files);

        if (pemFile && keyFile) {
          console.log("未找到 PFX 文件，将从 PEM 和 KEY 创建临时 PFX...");
          const tempPfxPath = await this.createPfxFromPemAndKey(
            pemFile,
            keyFile
          );
          pfxFile = {
            filePath: tempPfxPath,
            isFile: true,
            fileName: path.basename(tempPfxPath),
            fileExtension: ".pfx",
          };
        } else {
          logError("未找到 PFX 文件，也未找到 PEM+KEY 文件组合。");
          return;
        }
      }

      await this.generateJks(pfxFile.filePath);
    } catch (err) {
      logError(`生成 JKS 失败: ${(err as Error).message}`);
    }
  }

  /**
   * 从 PEM 和 KEY 文件创建临时 PFX 文件
   */
  private async createPfxFromPemAndKey(
    pemFile: string,
    keyFile: string
  ): Promise<string> {
    const tempPfxPath = path.join(
      this.directory,
      this.outputFileName + "_temp.pfx"
    );

    try {
      const pfxCommand = `${this.opensslPath} pkcs12 -export -out "${tempPfxPath}" -inkey "${keyFile}" -in "${pemFile}" -passout pass:${this.exportPassword}`;
      await execCommand(pfxCommand);
      return tempPfxPath;
    } catch (error) {
      throw new Error(`创建临时 PFX 文件失败: ${(error as Error).message}`);
    }
  }

  /**
   * 将 PFX/P12 转换为 JKS 格式
   */
  private async generateJks(pfxFile: string) {
    const jksOutput = path.join(this.directory, this.outputFileName + ".jks");
    const jksPasswordOutput = path.join(this.directory, "jks-password.txt");

    try {
      console.log(`将 PFX 转换为 JKS: ${pfxFile}`);

      // 使用 keytool 将 PKCS12 导入到 JKS
      // 注意: JDK 9+ 推荐使用 PKCS12 作为默认 keystore 类型
      const jksCommand = `keytool -importkeystore -srckeystore "${pfxFile}" -srcstoretype PKCS12 -srcstorepass ${this.exportPassword} -destkeystore "${jksOutput}" -deststoretype JKS -deststorepass ${this.exportPassword} -noprompt`;

      await execCommand(jksCommand);
      await fs.writeFile(jksPasswordOutput, this.exportPassword);

      console.log("\n✅ JKS 密钥库生成成功!");
      console.log(`📁 JKS 文件: ${jksOutput}`);
      console.log(`🔑 密码文件: ${jksPasswordOutput}`);
      console.log(`⚠️  请妥善保管密码文件，部署时需要使用。`);
      console.log(
        `\n💡 Tomcat 配置示例:\n   keystoreFile="${jksOutput}"\n   keystorePass="${this.exportPassword}"\n   keystoreType="JKS"`
      );
    } catch (error) {
      const errorMsg = (error as Error).message;
      if (errorMsg.includes("keytool")) {
        logError(
          `生成 JKS 过程出错: ${errorMsg}\n提示: 请确保已安装 Java JDK 并将 keytool 添加到 PATH 环境变量中。`
        );
      } else {
        logError(`生成 JKS 过程出错: ${errorMsg}`);
      }
    }
  }
}
