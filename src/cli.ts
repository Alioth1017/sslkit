import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import type { Options } from "./index";
import { CertificateGenerator } from "./index";

function getVersionSync(): string {
  try {
    const pkgPath = path.resolve(__dirname, "../package.json");
    const pkgRaw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(pkgRaw);
    return pkg.version || "";
  } catch {
    return "";
  }
}

const program = new Command();

program
  .name("sslkit")
  .version(getVersionSync())
  .description(
    "SSLKit - A powerful CLI tool for SSL certificate conversion\n\n" +
      "Supported formats: PEM, PFX, CRT, JKS\n" +
      "Supported servers: Nginx, Apache, Tomcat, IIS, and more"
  )
  .usage("[options]")
  .option(
    "-m, --mode <mode>",
    "Certificate format to generate (pem|pfx|crt|jks)",
    "pfx"
  )
  .option(
    "-d, --directory <directory>",
    "Directory containing certificate files",
    "."
  )
  .option(
    "-p, --export-password <exportPassword>",
    "Password for the generated file",
    "123456"
  )
  .option(
    "-o, --output-file-name <outputFileName>",
    "Output file name (without extension)",
    "certificate"
  )
  .option(
    "--openssl-path <opensslPath>",
    "Custom path to OpenSSL binary",
    "openssl"
  )
  .addHelpText(
    "after",
    `
Examples:
  $ sslkit -m pfx -d ./certs -p myPassword -o server
  $ sslkit -m pem -d ./ssl -p password123
  $ sslkit -m crt -d /path/to/certs -o apache_cert
  $ sslkit -m jks -d ./java/certs -p keystorePass

For more information, visit: https://github.com/Alioth1017/sslkit
`
  )
  .action(async (options: Options) => {
    console.log("🔐 SSLKit - SSL Certificate Conversion Tool\n");
    console.log("Configuration:");
    console.log(`  Mode: ${options.mode}`);
    console.log(`  Directory: ${options.directory}`);
    console.log(`  Output: ${options.outputFileName}`);
    console.log(`  Password: ${"*".repeat(options.exportPassword.length)}\n`);

    const generator = new CertificateGenerator(options);
    await generator.execute();
  });

program.parse(process.argv);
