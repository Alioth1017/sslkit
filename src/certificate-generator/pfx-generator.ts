import * as path from "path";
import * as fs from "fs/promises";
import { execCommand, logError } from "../utils";
import { CertificateGeneratorBase } from "./base";

export class PfxCertificateGenerator extends CertificateGeneratorBase {
  async generate() {
    try {
      const files = await this.getFilesInfo(this.directory);
      const { keyFile, pemFile } = await this.findKeyAndPem(files);
      if (!keyFile || !pemFile) {
        logError("Key or pem file not found in the directory.");
        return;
      }
      await this.generatePfx(
        this.directory,
        keyFile,
        pemFile,
        this.outputFileName + ".pfx",
        this.exportPassword
      );
    } catch (err) {
      logError(`Error reading directory: ${(err as Error).message}`);
    }
  }

  private async generatePfx(
    directory: string,
    keyPath: string,
    pemPath: string,
    outputFileName: string,
    password: string
  ) {
    const output = path.join(directory, outputFileName);
    const pfxPasswordOutput = path.join(directory, "pfx-password.txt");
    const pfxCommand = `${this.opensslPath} pkcs12 -export -out ${output} -inkey ${keyPath} -in ${pemPath} -passout pass:${password}`;
    try {
      await execCommand(pfxCommand);
      await fs.writeFile(pfxPasswordOutput, password);
      console.log("PFX file generated successfully!");
    } catch (error) {
      throw new Error(`Error generating PFX: ${(error as Error).message}`);
    }
  }
}
