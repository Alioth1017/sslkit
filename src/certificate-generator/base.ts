import * as path from "path";
import * as fs from "fs/promises";
import { execCommand } from "../utils";

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
