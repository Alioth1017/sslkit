import { CertificateGeneratorBase } from "./certificate-generator/base.ts";
import { CrtCertificateGenerator } from "./certificate-generator/crt-generator.ts";
import { JksCertificateGenerator } from "./certificate-generator/jks-generator.ts";
import { PemCertificateGenerator } from "./certificate-generator/pem-generator.ts";
import { PfxCertificateGenerator } from "./certificate-generator/pfx-generator.ts";
import { Validator } from "./validator.ts";

export type CertificateGeneratorMode = "pem" | "pfx" | "crt" | "jks";
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
      }

      let generator = this.getGenerator();
      await generator.generate();
    } catch (error) {
      console.error("生成证书时发生错误:", error);
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
