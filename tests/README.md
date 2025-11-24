# SSLKit Tests

这个目录包含了 SSLKit 的测试文件和示例证书。

## 目录结构

```
tests/
├── README.md              # 本文件
├── test-all.sh           # 运行所有测试的脚本
├── fixtures/             # 测试用的示例证书
│   ├── sample-pem/      # PEM 格式示例
│   ├── sample-pfx/      # PFX 格式示例
│   ├── sample-crt/      # CRT 格式示例
│   └── expected/        # 预期输出
└── integration/         # 集成测试脚本
    ├── test-pfx.sh
    ├── test-pem.sh
    ├── test-crt.sh
    └── test-jks.sh
```

## 运行测试

### 运行所有测试

```bash
cd tests
./test-all.sh
```

### 运行单个测试

```bash
# 测试 PFX 生成
./integration/test-pfx.sh

# 测试 PEM 生成
./integration/test-pem.sh

# 测试 CRT 生成
./integration/test-crt.sh

# 测试 JKS 生成（需要 Java）
./integration/test-jks.sh
```

## 生成测试证书

如果需要重新生成测试证书，可以使用以下命令：

```bash
cd fixtures
./generate-test-certs.sh
```

## 注意事项

1. 所有测试证书都是自签名证书，仅用于测试目的
2. 测试使用的密码统一为 `test123456`
3. JKS 测试需要安装 Java JDK
4. 所有生成的文件会在测试后自动清理
