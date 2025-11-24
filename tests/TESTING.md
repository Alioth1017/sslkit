# SSLKit 测试指南

完整的测试文档，包括单元测试、集成测试、性能测试和边缘案例测试。

## 快速开始

```bash
# 1. 构建项目
pnpm build

# 2. 生成测试证书
pnpm test:gen-certs

# 3. 运行所有测试
pnpm test
```

## 测试类型

### 1. 单元测试

测试独立的函数和模块。

```bash
# 运行所有单元测试
pnpm test:unit

# 单独运行
cd tests/unit
node validator.test.js
node utils.test.js
```

**覆盖范围：**

- ✅ Validator 类的所有方法
- ✅ Utils 工具函数
- ✅ 输入验证逻辑
- ✅ 错误处理

### 2. 集成测试

测试完整的证书转换流程。

```bash
# 运行所有集成测试
pnpm test:integration

# 单独测试不同格式
pnpm test:pfx   # PFX 生成测试
pnpm test:pem   # PEM 生成测试
pnpm test:crt   # CRT 生成测试
pnpm test:jks   # JKS 生成测试（需要 Java）
```

**测试场景：**

#### PFX 测试

- 从 PEM + KEY 生成 PFX
- 验证 PFX 文件完整性
- 验证密码文件生成
- 测试文件大小和格式

#### PEM 测试

- 从 PFX 提取 PEM 和 KEY
- 验证 PEM 证书格式
- 验证私钥格式
- 测试证书信息提取

#### CRT 测试

- 从 PEM 转换为 CRT
- 验证 CRT 格式
- 测试 Apache 兼容性
- 验证证书有效期

#### JKS 测试

- 从 PFX 转换为 JKS
- 验证 Java KeyStore 格式
- 测试 keytool 集成
- 验证 Tomcat 兼容性

### 3. 边缘案例测试

测试特殊情况和错误处理。

```bash
cd tests/integration
chmod +x test-edge-cases.sh
./test-edge-cases.sh
```

**测试案例：**

1. ✅ 空目录处理
2. ✅ 不存在的目录
3. ✅ 无效的模式参数
4. ✅ 特殊字符密码
5. ✅ 长文件名处理
6. ✅ 仅有 KEY 文件（应报错）
7. ✅ 仅有 PEM 文件（应报错）
8. ✅ 文件已存在（覆盖警告）

### 4. 性能测试

测试工具性能和效率。

```bash
cd tests/integration
chmod +x test-performance.sh
./test-performance.sh
```

**性能指标：**

- 单次转换时间
- 批量转换性能
- 不同格式转换对比
- 文件大小影响

## 测试文件结构

```
tests/
├── README.md                    # 本文件
├── TESTING.md                   # 详细测试指南
├── .gitignore                   # 忽略测试输出
├── test-all.sh                  # 运行所有测试
│
├── fixtures/                    # 测试数据
│   ├── generate-test-certs.sh  # 生成测试证书
│   ├── sample-pem/             # PEM 格式示例
│   │   ├── certificate.pem
│   │   ├── private.key
│   │   └── request.csr
│   ├── sample-pfx/             # PFX 格式示例
│   │   ├── certificate.pfx
│   │   ├── pfx-password.txt
│   │   ├── certificate.pem
│   │   └── private.key
│   └── sample-crt/             # CRT 格式示例
│       ├── certificate.crt
│       └── private.key
│
├── unit/                        # 单元测试
│   ├── run-tests.sh
│   ├── validator.test.js
│   └── utils.test.js
│
├── integration/                 # 集成测试
│   ├── test-pfx.sh
│   ├── test-pem.sh
│   ├── test-crt.sh
│   ├── test-jks.sh
│   ├── test-edge-cases.sh
│   └── test-performance.sh
│
└── output/                      # 测试输出（git忽略）
    ├── pfx-test/
    ├── pem-test/
    ├── crt-test/
    ├── jks-test/
    ├── edge-cases/
    └── performance/
```

## 测试证书说明

所有测试证书都是自签名证书，仅用于测试目的。

**证书信息：**

- Subject: CN=test.example.com, O=Test, OU=IT, L=Beijing, ST=Beijing, C=CN
- 有效期: 10 年
- 密钥长度: 2048 位 RSA
- 测试密码: `test123456`

**重新生成测试证书：**

```bash
pnpm test:gen-certs
```

## CI/CD 集成

### GitHub Actions

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Generate test certificates
        run: pnpm test:gen-certs

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run integration tests
        run: pnpm test:integration
```

### GitLab CI

```yaml
test:
  image: node:18
  before_script:
    - npm install -g pnpm
    - pnpm install
    - pnpm build
    - pnpm test:gen-certs
  script:
    - pnpm test:unit
    - pnpm test:integration
```

## 常见问题

### Q: 测试失败提示 "OpenSSL not found"

**A:** 确保已安装 OpenSSL：

```bash
# macOS
brew install openssl

# Ubuntu/Debian
sudo apt-get install openssl
```

### Q: JKS 测试跳过

**A:** 安装 Java JDK：

```bash
# macOS
brew install openjdk

# Ubuntu/Debian
sudo apt-get install default-jdk
```

### Q: 权限错误

**A:** 给测试脚本添加执行权限：

```bash
chmod +x tests/**/*.sh
```

### Q: 测试证书过期

**A:** 重新生成测试证书：

```bash
pnpm test:gen-certs
```

## 最佳实践

1. **运行测试前先构建**

   ```bash
   pnpm build
   ```

2. **定期更新测试证书**

   ```bash
   pnpm test:gen-certs
   ```

3. **CI/CD 中包含所有测试**

   ```bash
   pnpm test  # 运行单元测试和集成测试
   ```

4. **本地开发时使用特定测试**

   ```bash
   pnpm test:pfx  # 只测试你修改的部分
   ```

5. **提交前运行完整测试**
   ```bash
   pnpm test
   ```

## 添加新测试

### 添加单元测试

1. 在 `tests/unit/` 创建新文件
2. 使用测试框架模板
3. 更新 `run-tests.sh`

### 添加集成测试

1. 在 `tests/integration/` 创建新脚本
2. 遵循现有脚本格式
3. 更新 `test-all.sh`

## 测试覆盖率

当前测试覆盖的功能：

- ✅ PFX 生成（100%）
- ✅ PEM 生成（100%）
- ✅ CRT 生成（100%）
- ✅ JKS 生成（100%）
- ✅ 输入验证（100%）
- ✅ 错误处理（90%）
- ✅ 边缘案例（85%）
- ✅ 文件操作（95%）

## 贡献

添加测试时请确保：

1. 测试可重复运行
2. 清理临时文件
3. 包含适当的错误消息
4. 更新测试文档

## 支持

如有测试相关问题：

- 查看 GitHub Issues
- 参考现有测试用例
- 联系维护者
