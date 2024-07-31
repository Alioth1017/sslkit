import { CertificateGeneratorBase } from "./certificate-generator/base";
import { CrtCertificateGenerator } from "./certificate-generator/crt-generator";
import { JksCertificateGenerator } from "./certificate-generator/jks-generator";
import { PemCertificateGenerator } from "./certificate-generator/pem-generator";
import { PfxCertificateGenerator } from "./certificate-generator/pfx-generator";

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
}

export class CertificateGenerator {
  private mode: CertificateGeneratorMode;
  private directory: string;
  private exportPassword: string;
  private outputFileName: string;
  private opensslPath: string;

  constructor(options: Options) {
    this.directory = options.directory;
    this.exportPassword = options.exportPassword;
    this.outputFileName = options.outputFileName || "certificate";
    this.opensslPath = options.opensslPath || "openssl";
    this.mode = options.mode || "pfx";
  }

  async execute() {
    try {
      let generator = this.getGenerator();
      await generator.generate();
    } catch (error) {
      console.error("Error generating certificate:", error);
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
