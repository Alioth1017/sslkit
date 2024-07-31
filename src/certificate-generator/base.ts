import * as path from "path";
import * as fs from "fs/promises";

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

  protected async findKeyAndPem(files: FileInfo[]) {
    try {
      let keyFile: string | null = null;
      let pemFile: string | null = null;

      for (const file of files) {
        const { filePath, fileExtension, isFile } = file;

        if (isFile) {
          if (!keyFile && fileExtension === ".key") {
            keyFile = filePath;
          } else if (!pemFile && fileExtension === ".pem") {
            pemFile = filePath;
          }
        }
        if (keyFile && pemFile) {
          break;
        }
      }
      return { keyFile, pemFile };
    } catch (err) {
      throw new Error(`Error reading directory: ${(err as Error).message}`);
    }
  }
}
