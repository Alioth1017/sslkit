import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";

export const execPromise = promisify(exec);

export function logError(message: string) {
  console.error(`❌ ${message}`);
}

export function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

export function logWarning(message: string) {
  console.warn(`⚠️  ${message}`);
}

export function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

export async function execCommand(command: string): Promise<void> {
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr && !stderr.includes("Signature ok")) {
      // OpenSSL 有些正常输出在 stderr，需要过滤
      const shouldLog = !stderr.match(
        /MAC verified OK|Signature ok|subject|issuer|notBefore|notAfter/i
      );
      if (shouldLog) {
        logWarning(`stderr: ${stderr}`);
      }
    }
    if (stdout && stdout.trim()) {
      console.log(stdout.trim());
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    logError(errorMessage);
    throw error;
  }
}

/**
 * 安全删除文件（如果存在）
 */
export async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    logInfo(`已删除临时文件: ${filePath}`);
  } catch (error) {
    // 忽略文件不存在的错误
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      logWarning(`删除文件失败: ${filePath}`);
    }
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 获取文件信息摘要
 */
export async function getFileInfo(filePath: string): Promise<string> {
  try {
    const stats = await fs.stat(filePath);
    return `文件: ${filePath}, 大小: ${formatFileSize(stats.size)}`;
  } catch (error) {
    return `文件: ${filePath} (无法获取信息)`;
  }
}
