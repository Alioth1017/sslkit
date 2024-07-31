import { exec } from "child_process";
import { promisify } from "util";

export const execPromise = promisify(exec);

export function logError(message: string) {
  console.error(message);
}

export async function execCommand(command: string): Promise<void> {
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) {
      logError(`stderr: ${stderr}`);
    }
    console.log(`stdout: \n${stdout}`);
  } catch (error) {
    logError(`stderr: ${(error as Error).message}`);
    throw error;
  }
}
