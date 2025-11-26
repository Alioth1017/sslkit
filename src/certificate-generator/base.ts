import * as path from "path";
import * as fs from "fs/promises";
import { execCommand } from "../utils.ts";

export type FileInfo = {
  filePath: string;
  isFile: boolean;
  fileName: string;
  fileExtension: string;
};

export abstract class CertificateGeneratorBase {
  protected directory: string;
  protected outputFileName: string;
  protected exportPassword: string;
  protected opensslPath: string;

  constructor(
    directory: string,
    outputFileName: string,
    exportPassword: string,
    opensslPath: string
  ) {
    this.directory = directory;
    this.outputFileName = outputFileName;
    this.exportPassword = exportPassword;
    this.opensslPath = opensslPath;
  }

  abstract generate(): Promise<void>;

  protected async getFilesInfo(directory: string): Promise<FileInfo[]> {
    try {
      const files = await fs.readdir(directory);
      const fileInfoPromises = files.map(async (fileName) => {
        const filePath = path.join(directory, fileName);
        const stats = await fs.stat(filePath);
        const isFile = stats.isFile();
        return {
          filePath,
          isFile: isFile,
          fileName: fileName,
          fileExtension: isFile ? path.extname(fileName) : "",
        };
      });
      return Promise.all(fileInfoPromises);
    } catch (err) {
      throw new Error(`Error reading directory: ${(err as Error).message}`);
    }
  }

  /**
   * 查找目录下包含 password 的文件（如 pfx-password.txt），返回内容字符串。
   * 支持常见命名如 password.txt, pfx-password.txt, *.password, *.pass 等。
   * 若未找到则返回 null。
   */
  protected async findPassword(files: FileInfo[]): Promise<string | null> {
    const passwordFilePatterns = [/password/i, /pass/i];
    for (const file of files) {
      if (!file.isFile) continue;
      if (
        passwordFilePatterns.some((pat) => pat.test(file.fileName)) ||
        [".password", ".pass", ".txt"].includes(file.fileExtension)
      ) {
        try {
          const content = await fs.readFile(file.filePath, "utf8");
          if (content.trim()) return content.trim();
        } catch {
          // 忽略读取错误
        }
      }
    }
    return null;
  }

  /** 更新 exportPassword，如果 password 文件存在且 exportPassword 为默认值 */
  protected async updateExportPassword(files: FileInfo[]): Promise<void> {
    const password = await this.findPassword(files);
    if (this.exportPassword === "123456" && password) {
      this.exportPassword = password;
    }
  }

  /**
   * 从 PFX 文件提取证书（PEM 格式，不含私钥）
   * @param pfxFile PFX 文件路径
   * @param outputPath 输出 PEM 路径（可选）
   * @returns PEM 文件路径
   */
  protected async extractCertFromPfx(
    pfxFile: string,
    outputPath?: string
  ): Promise<string> {
    const pemOutput =
      outputPath ||
      path.join(this.directory, this.outputFileName + "_temp.pem");
    try {
      const certCommand = `${this.opensslPath} pkcs12 -in "${pfxFile}" -clcerts -nokeys -out "${pemOutput}" -passin pass:${this.exportPassword}`;
      await execCommand(certCommand);
      return pemOutput;
    } catch (error) {
      throw new Error(`从 PFX 提取证书失败: ${(error as Error).message}`);
    }
  }

  /**
   * 从 PFX 文件提取私钥（PKCS#8 格式，无加密）
   * @param pfxFile PFX 文件路径
   * @param outputPath 输出私钥路径（可选）
   * @returns 私钥文件路径
   */
  protected async extractKeyFromPfx(
    pfxFile: string,
    outputPath?: string
  ): Promise<string> {
    const tempKeyPath = path.join(
      this.directory,
      this.outputFileName + ".temp.key"
    );
    const keyOutput =
      outputPath || path.join(this.directory, this.outputFileName + ".key");
    try {
      // 先提取（可能包含 Bag Attributes）
      const extractCmd = `${this.opensslPath} pkcs12 -in "${pfxFile}" -nocerts -nodes -out "${tempKeyPath}" -passin pass:${this.exportPassword}`;
      await execCommand(extractCmd);
      // 使用 pkey 过滤掉 Bag Attributes，输出纯净的私钥
      const cleanCmd = `${this.opensslPath} pkey -in "${tempKeyPath}" -out "${keyOutput}"`;
      await execCommand(cleanCmd);
      // 清理临时文件
      const { safeUnlink } = await import("../utils.ts");
      await safeUnlink(tempKeyPath);
      return keyOutput;
    } catch (error) {
      throw new Error(`从 PFX 提取私钥失败: ${(error as Error).message}`);
    }
  }

  /**
   * 保存密码到指定文件
   * @param fileName 密码文件名（如 pfx-password.txt）
   */
  protected async savePasswordFile(fileName: string): Promise<string> {
    const passwordFilePath = path.join(this.directory, fileName);
    await fs.writeFile(passwordFilePath, this.exportPassword);
    return passwordFilePath;
  }

  protected async findKeyFile(files: FileInfo[]): Promise<string | null> {
    // 匹配任意类型的私钥块，允许不同数量的 -、空格和类型
    const privateKeyBlockRegex = /-+\s*BEGIN\s+[A-Z ]*PRIVATE KEY\s*-+/;
    for (const file of files) {
      if (file.isFile && file.fileExtension === ".key") {
        return file.filePath;
      }
    }
    // If not found by extension, check file content for private key block using regex
    for (const file of files) {
      if (!file.isFile) continue;
      try {
        const content = await fs.readFile(file.filePath, "utf8");
        if (privateKeyBlockRegex.test(content)) {
          return file.filePath;
        }
      } catch {
        // Ignore read errors
      }
    }
    return null;
  }

  /**
   * 查找目录中包含 RSA 私钥块（PKCS#1：BEGIN RSA PRIVATE KEY）的文件路径。
   * 若找到则返回该文件路径，未找到返回 null。
   */
  protected async findRsaPrivateKey(files: FileInfo[]): Promise<string | null> {
    for (const file of files) {
      if (!file.isFile) continue;
      if (!/(\.key|\.pem|\.pk8)$/i.test(file.fileName)) continue;
      try {
        const content = await fs.readFile(file.filePath, "utf8");
        if (/[- ]+BEGIN RSA PRIVATE KEY[- ]+/.test(content)) {
          return file.filePath;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  protected async findPemFile(files: FileInfo[]): Promise<string | null> {
    // 只匹配 CERTIFICATE，后面只能有空格和-，排除如 CERTIFICATE REQUEST
    const certificateBlockRegex = /-+\s*BEGIN\s+CERTIFICATE[ \t-]*\r?\n/;
    for (const file of files) {
      if (file.isFile && file.fileExtension === ".pem") {
        return file.filePath;
      }
    }
    // If not found by extension, check file content for certificate block using regex
    for (const file of files) {
      if (!file.isFile) continue;
      try {
        const content = await fs.readFile(file.filePath, "utf8");
        if (certificateBlockRegex.test(content)) {
          return file.filePath;
        }
      } catch {
        // Ignore read errors
      }
    }
    return null;
  }

  protected async findCrtOrCerFile(files: FileInfo[]): Promise<string | null> {
    // 只遍历 .crt/.cer 文件，内容需为 CERTIFICATE REQUEST 块（CSR）
    const csrBlockRegex = /-+\s*BEGIN\s+CERTIFICATE REQUEST[ \t-]*\r?\n/;
    for (const file of files) {
      if (
        file.isFile &&
        (file.fileExtension === ".crt" || file.fileExtension === ".cer")
      ) {
        try {
          const content = await fs.readFile(file.filePath, "utf8");
          if (csrBlockRegex.test(content)) {
            return file.filePath;
          }
        } catch {
          // Ignore read errors
        }
      }
    }
    return null;
  }

  /**
   * 将指定 CRT/CER 文件转换为 PEM 文件，若 PEM 已存在则直接返回。
   * @param crtOrCerPath 输入的 CRT/CER 文件路径
   * @param pemPath 输出 PEM 路径（可选，默认同目录同名 .pem）
   * @returns PEM 文件路径
   */
  protected async convertCrtOrCerToPem(
    crtOrCerPath: string,
    pemPath?: string
  ): Promise<string> {
    if (!crtOrCerPath) throw new Error("未指定 CRT/CER 文件路径");
    const outPem = pemPath || crtOrCerPath.replace(/\.(crt|cer)$/i, ".pem");
    try {
      // 若 PEM 已存在则直接返回
      try {
        await fs.access(outPem);
        return outPem;
      } catch {
        // 文件不存在，继续转换
      }
      const convertCmd = `${this.opensslPath} x509 -in "${crtOrCerPath}" -out "${outPem}" -outform PEM`;
      await execCommand(convertCmd);
      return outPem;
    } catch (err) {
      throw new Error(
        `Failed to convert CRT/CER to PEM: ${(err as Error).message}`
      );
    }
  }
}
