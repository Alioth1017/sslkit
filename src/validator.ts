import * as fs from "fs/promises";
import * as path from "path";
import { execPromise } from "./utils";

/**
 * 验证器类，用于检查工具依赖和输入参数
 */
export class Validator {
  /**
   * 检查 OpenSSL 是否可用
   */
  static async checkOpenSSL(opensslPath: string): Promise<boolean> {
    try {
      const { stdout } = await execPromise(`${opensslPath} version`);
      console.log(`OpenSSL 版本: ${stdout.trim()}`);
      return true;
    } catch (error) {
      console.error(
        `OpenSSL 不可用。请确保已安装 OpenSSL 并添加到 PATH 环境变量中。`
      );
      console.error(`尝试的路径: ${opensslPath}`);
      return false;
    }
  }

  /**
   * 检查 keytool 是否可用（JKS 模式需要）
   */
  static async checkKeytool(): Promise<boolean> {
    try {
      const { stdout } = await execPromise(`keytool -help`);
      console.log(`Keytool 可用`);
      return true;
    } catch (error) {
      console.warn(`Keytool 不可用。如果需要生成 JKS 文件，请安装 Java JDK。`);
      return false;
    }
  }

  /**
   * 检查目录是否存在且可访问
   */
  static async checkDirectory(directory: string): Promise<boolean> {
    try {
      const stats = await fs.stat(directory);
      if (!stats.isDirectory()) {
        console.error(`错误: ${directory} 不是一个有效的目录。`);
        return false;
      }
      // 检查读写权限
      await fs.access(directory, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch (error) {
      console.error(`错误: 无法访问目录 ${directory}`);
      console.error(`请确保目录存在且具有读写权限。`);
      return false;
    }
  }

  /**
   * 验证密码强度（可选）
   */
  static validatePassword(password: string): boolean {
    if (!password || password.length < 4) {
      console.warn(`警告: 密码长度较短（少于 4 个字符），建议使用更强的密码。`);
      return false;
    }
    return true;
  }

  /**
   * 检查输出文件是否已存在
   */
  static async checkOutputFileExists(
    directory: string,
    fileName: string,
    extension: string
  ): Promise<boolean> {
    const filePath = path.join(directory, fileName + extension);
    try {
      await fs.access(filePath);
      console.warn(`警告: 文件 ${filePath} 已存在，将被覆盖。`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证证书模式
   */
  static validateMode(mode: string): boolean {
    const validModes = ["pem", "pfx", "crt", "jks"];
    if (!validModes.includes(mode)) {
      console.error(
        `错误: 无效的模式 "${mode}"。有效选项: ${validModes.join(", ")}`
      );
      return false;
    }
    return true;
  }

  /**
   * 完整的预检查
   */
  static async preflightCheck(
    mode: string,
    directory: string,
    opensslPath: string,
    exportPassword: string
  ): Promise<boolean> {
    console.log("正在执行预检查...\n");

    // 验证模式
    if (!this.validateMode(mode)) {
      return false;
    }

    // 检查目录
    if (!(await this.checkDirectory(directory))) {
      return false;
    }

    // 检查 OpenSSL
    if (!(await this.checkOpenSSL(opensslPath))) {
      return false;
    }

    // JKS 模式需要 keytool
    if (mode === "jks") {
      const keytoolAvailable = await this.checkKeytool();
      if (!keytoolAvailable) {
        console.error(
          `错误: JKS 模式需要 Java JDK 的 keytool 工具，但未找到。`
        );
        return false;
      }
    }

    // 验证密码
    this.validatePassword(exportPassword);

    console.log("预检查完成。\n");
    return true;
  }
}
