# SSLKit

[English](./README.md) | 简体中文

一个强大的命令行工具，用于转换和管理不同格式的 SSL 证书。轻松在 PEM、PFX、CRT 和 JKS 格式之间转换，适用于各种 Web 服务器和应用程序。

## 功能特性

- 🔄 **多格式支持**: 在 PEM、PFX、CRT 和 JKS 格式之间转换
- 🖥️ **服务器兼容**: 为 Nginx、Apache、Tomcat、IIS 等生成证书
- ✅ **智能检测**: 自动检测和处理证书文件
- 🔍 **预检查**: 在处理前验证依赖项和输入
- 🛡️ **安全**: 为生成的密钥库提供密码保护

## 支持的格式

| 格式    | 使用场景            | 服务器                    |
| ------- | ------------------- | ------------------------- |
| **PEM** | Nginx、通用用途     | Nginx、大多数 Unix 服务器 |
| **PFX** | Windows 服务器、IIS | IIS、Tomcat、Windows      |
| **CRT** | Apache 服务器       | Apache、各种 Unix 服务器  |
| **JKS** | Java 应用程序       | Tomcat、Java 应用程序     |

## 前置要求

- **OpenSSL**: 所有操作都需要
- **Java JDK**: 仅 JKS 格式转换需要（keytool）

### 安装前置依赖

**macOS:**

```bash
# OpenSSL（通常已预装）
brew install openssl

# Java（用于 JKS）
brew install openjdk
```

**Ubuntu/Debian:**

```bash
# OpenSSL
sudo apt-get install openssl

# Java（用于 JKS）
sudo apt-get install default-jdk
```

**Windows:**

- 从 [https://slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html) 下载 OpenSSL
- 从 [https://www.oracle.com/java/technologies/downloads/](https://www.oracle.com/java/technologies/downloads/) 下载 Java JDK

## 安装

```bash
npm install -g sslkit
```

或使用 npx（无需安装）：

```bash
npx sslkit [选项]
```

## 使用方法

### 基本命令

```bash
sslkit -m <模式> -d <目录> [选项]
```

### 选项说明

| 选项                 | 简写 | 描述                               | 默认值        |
| -------------------- | ---- | ---------------------------------- | ------------- |
| `--mode`             | `-m` | 要生成的证书格式 (pem/pfx/crt/jks) | `pfx`         |
| `--directory`        | `-d` | 包含证书文件的目录                 | `.`           |
| `--export-password`  | `-p` | 生成文件的密码                     | `123456`      |
| `--output-file-name` | `-o` | 输出文件名（不含扩展名）           | `certificate` |
| `--openssl-path`     | -    | OpenSSL 二进制文件路径             | `openssl`     |
| `--version`          | `-V` | 显示版本号                         | -             |
| `--help`             | `-h` | 显示帮助                           | -             |

## 使用示例

### 1. 从 PEM + KEY 生成 PFX

```bash
# 将 certificate.pem 和 private.key 放在一个目录中
sslkit -m pfx -d ./certs -p mySecurePassword -o server
```

**输出:**

- `server.pfx`
- `pfx-password.txt`（包含密码）

### 2. 从 PFX 生成 PEM

```bash
sslkit -m pem -d ./certs -p myPassword -o nginx_cert
```

**输出:**

- `nginx_cert.pem`（证书）
- `nginx_cert.key`（私钥）
- `nginx_cert_combined.pem`（证书 + 私钥合并文件）

### 3. 为 Apache 生成 CRT

```bash
sslkit -m crt -d ./certs -o apache_cert
```

**输出:**

- `apache_cert.crt`（证书）
- `apache_cert.key`（私钥）

### 4. 为 Tomcat 生成 JKS

```bash
sslkit -m jks -d ./certs -p keystorePassword -o tomcat_keystore
```

**输出:**

- `tomcat_keystore.jks`
- `jks-password.txt`（包含密码）

## 服务器配置示例

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

## 工作原理

### 转换流程

1. **PFX 生成**: PEM + KEY → PFX
2. **PEM 生成**: PFX → PEM + KEY
3. **CRT 生成**: PEM/PFX → CRT + KEY
4. **JKS 生成**: PFX/PEM+KEY → JKS

### 文件检测

SSLKit 会自动检测指定目录中的证书文件：

- 搜索 `.key`、`.pem`、`.pfx`、`.crt`、`.cer` 文件
- 使用正则表达式验证文件内容
- 支持各种证书格式和编码

## 开发

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/Alioth1017/sslkit.git
cd sslkit

# 安装依赖
pnpm install

# 构建
pnpm build

# 测试
pnpm test
```

### 项目结构

```
sslkit/
├── src/
│   ├── cli.ts                    # CLI 入口
│   ├── index.ts                  # 主库
│   ├── utils.ts                  # 工具函数
│   ├── validator.ts              # 输入验证
│   └── certificate-generator/
│       ├── base.ts               # 基础生成器类
│       ├── pem-generator.ts      # PEM 生成器
│       ├── pfx-generator.ts      # PFX 生成器
│       ├── crt-generator.ts      # CRT 生成器
│       └── jks-generator.ts      # JKS 生成器
├── dist/                         # 编译输出
├── package.json
└── README.md
```

## 故障排除

### 找不到 OpenSSL

```bash
# 检查是否已安装 OpenSSL
openssl version

# 如果未安装，请安装（参见前置要求部分）
```

### 找不到 Keytool（用于 JKS）

```bash
# 检查是否已安装 Java
java -version
keytool -help

# 如果未安装，请安装 Java JDK（参见前置要求部分）
```

### 权限被拒绝

```bash
# 确保对目标目录有读/写权限
chmod 755 /path/to/cert/directory
```

## 常见问题

### 为什么需要密码？

生成的 PFX 和 JKS 文件需要密码来保护私钥。请务必记住密码，并妥善保管生成的密码文件。

### 支持自签名证书吗？

是的，SSLKit 支持自签名证书和 CA 签发的证书。

### 可以批量转换吗？

目前每次运行只能转换一个证书。如需批量转换，可以编写脚本循环调用。

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

ISC

## 作者

Alioth

## 关键词

- SSL 证书
- 证书转换
- PEM
- PFX
- CRT
- JKS
- OpenSSL
- 证书管理
- 密钥库
- Web 服务器配置
