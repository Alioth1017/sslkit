import { Command } from "commander";
import { Options, CertificateGenerator } from "./index";
const program = new Command();

program
  .name("sslkit")
  .version("0.0.1")
  .description("sslkit - A command line tool for ssl certificate.")
  .usage("[options]")
  .option("-m, --mode <mode>", "Mode of the certificate to generate", "pfx")
  .option(
    "-d, --directory <directory>",
    "Directory to search for key、pem、pfx or other files",
    "."
  )
  .option(
    "-p, --export-password <exportPassword>",
    "Password for the PFX file",
    "123456"
  )
  .option(
    "-o, --output-file-name <outputFileName>",
    "Output file name for the generated file",
    "certificate"
  )
  .option(
    "--openssl-path <opensslPath>",
    "Path to the openssl binary",
    "openssl"
  )
  .action(async (options: Options) => {
    console.log("options: \n", options);
    const generator = new CertificateGenerator(options);
    await generator.execute();
  });

program.parse(process.argv);
