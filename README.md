# SSLKit

English | [简体中文](./README_zh.md)

A powerful command-line tool for converting and managing SSL certificates across different formats. Easily convert between PEM, PFX, CRT, and JKS formats for various web servers and applications.

## Features

- 🔄 **Multiple Format Support**: Convert between PEM, PFX, CRT, and JKS formats
- 🖥️ **Server Compatibility**: Generate certificates for Nginx, Apache, Tomcat, IIS, and more
- ✅ **Smart Detection**: Automatically detects and processes certificate files
- 🔍 **Pre-flight Checks**: Validates dependencies and inputs before processing
- 🛡️ **Secure**: Password protection for generated keystores

## Supported Formats

| Format  | Use Case             | Servers                      |
| ------- | -------------------- | ---------------------------- |
| **PEM** | Nginx, general use   | Nginx, most Unix servers     |
| **PFX** | Windows servers, IIS | IIS, Tomcat, Windows         |
| **CRT** | Apache servers       | Apache, various Unix servers |
| **JKS** | Java applications    | Tomcat, Java applications    |

## Prerequisites

- **OpenSSL**: Required for all operations
- **Java JDK**: Required only for JKS format conversion (keytool)

### Installation of Prerequisites

**macOS:**

```bash
# OpenSSL (usually pre-installed)
brew install openssl

# Java (for JKS)
brew install openjdk
```

**Ubuntu/Debian:**

```bash
# OpenSSL
sudo apt-get install openssl

# Java (for JKS)
sudo apt-get install default-jdk
```

**Windows:**

- Download OpenSSL from [https://slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html)
- Download Java JDK from [https://www.oracle.com/java/technologies/downloads/](https://www.oracle.com/java/technologies/downloads/)

## Installation

```bash
npm install -g sslkit
```

Or use with npx (no installation required):

```bash
npx sslkit [options]
```

## Usage

### Basic Command

```bash
sslkit -m <mode> -d <directory> [options]
```

### Options

| Option               | Alias | Description                                      | Default       |
| -------------------- | ----- | ------------------------------------------------ | ------------- |
| `--mode`             | `-m`  | Certificate format to generate (pem/pfx/crt/jks) | `pfx`         |
| `--directory`        | `-d`  | Directory containing certificate files           | `.`           |
| `--export-password`  | `-p`  | Password for the generated file                  | `123456`      |
| `--output-file-name` | `-o`  | Output file name (without extension)             | `certificate` |
| `--openssl-path`     | -     | Path to OpenSSL binary                           | `openssl`     |
| `--version`          | `-V`  | Show version number                              | -             |
| `--help`             | `-h`  | Show help                                        | -             |

## Examples

### 1. Generate PFX from PEM + KEY

```bash
# Place your certificate.pem and private.key in a directory
sslkit -m pfx -d ./certs -p mySecurePassword -o server
```

**Output:**

- `server.pfx`
- `pfx-password.txt` (contains the password)

### 2. Generate PEM from PFX

```bash
sslkit -m pem -d ./certs -p myPassword -o nginx_cert
```

**Output:**

- `nginx_cert.pem` (certificate)
- `nginx_cert.key` (private key)
- `nginx_cert_combined.pem` (certificate + key in one file)

### 3. Generate CRT for Apache

```bash
sslkit -m crt -d ./certs -o apache_cert
```

**Output:**

- `apache_cert.crt` (certificate)
- `apache_cert.key` (private key)

### 4. Generate JKS for Tomcat

```bash
sslkit -m jks -d ./certs -p keystorePassword -o tomcat_keystore
```

**Output:**

- `tomcat_keystore.jks`
- `jks-password.txt` (contains the password)

## Server Configuration Examples

### Nginx (PEM)

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/certificate.key;
}
```

### Apache (CRT)

```apache
<VirtualHost *:443>
    ServerName example.com

    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/certificate.key
</VirtualHost>
```

### Tomcat (PFX)

```xml
<Connector port="8443" protocol="HTTP/1.1" SSLEnabled="true"
    maxThreads="150" scheme="https" secure="true"
    keystoreFile="/path/to/certificate.pfx"
    keystorePass="yourPassword"
    keystoreType="PKCS12"
    clientAuth="false" sslProtocol="TLS"/>
```

### Tomcat (JKS)

```xml
<Connector port="8443" protocol="HTTP/1.1" SSLEnabled="true"
    maxThreads="150" scheme="https" secure="true"
    keystoreFile="/path/to/keystore.jks"
    keystorePass="yourPassword"
    keystoreType="JKS"
    clientAuth="false" sslProtocol="TLS"/>
```

## How It Works

### Conversion Flows

1. **PFX Generation**: PEM + KEY → PFX
2. **PEM Generation**: PFX → PEM + KEY
3. **CRT Generation**: PEM/PFX → CRT + KEY
4. **JKS Generation**: PFX/PEM+KEY → JKS

### File Detection

SSLKit automatically detects certificate files in the specified directory:

- Searches for `.key`, `.pem`, `.pfx`, `.crt`, `.cer` files
- Validates file content using regex patterns
- Supports various certificate formats and encodings

## Development

### Build from Source

```bash
# Clone repository
git clone https://github.com/Alioth1017/sslkit.git
cd sslkit

# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test
```

### Project Structure

```
sslkit/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── index.ts                  # Main library
│   ├── utils.ts                  # Utility functions
│   ├── validator.ts              # Input validation
│   └── certificate-generator/
│       ├── base.ts               # Base generator class
│       ├── pem-generator.ts      # PEM generator
│       ├── pfx-generator.ts      # PFX generator
│       ├── crt-generator.ts      # CRT generator
│       └── jks-generator.ts      # JKS generator
├── dist/                         # Compiled output
├── package.json
└── README.md
```

## Troubleshooting

### OpenSSL not found

```bash
# Check if OpenSSL is installed
openssl version

# If not, install it (see Prerequisites section)
```

### Keytool not found (for JKS)

```bash
# Check if Java is installed
java -version
keytool -help

# If not, install Java JDK (see Prerequisites section)
```

### Permission denied

```bash
# Make sure you have read/write permissions in the target directory
chmod 755 /path/to/cert/directory
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Author

Alioth

## Keywords

- SSL certificate
- certificate conversion
- PEM
- PFX
- CRT
- JKS
- OpenSSL
- certificate management
- keystore
- web server configuration
