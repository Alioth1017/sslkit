#!/bin/bash

# 生成测试用的自签名证书
# 此脚本仅用于生成测试数据

set -e

echo "🔐 开始生成测试证书..."

# 创建目录
mkdir -p sample-pem sample-pfx sample-crt expected

# 1. 生成私钥和 PEM 证书
echo "📝 生成 PEM 证书和私钥..."
cd sample-pem

# 生成私钥
openssl genrsa -out private.key 2048

# 生成自签名证书
openssl req -new -x509 -key private.key -out certificate.pem -days 3650 \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=Test/OU=IT/CN=test.example.com"

echo "✅ PEM 证书生成完成"
cd ..

# 2. 从 PEM 生成 PFX
echo "📝 生成 PFX 证书..."
cd sample-pfx
cp ../sample-pem/private.key ./
cp ../sample-pem/certificate.pem ./

openssl pkcs12 -export -out certificate.pfx \
  -inkey private.key -in certificate.pem \
  -passout pass:test123456

echo "test123456" > pfx-password.txt
echo "✅ PFX 证书生成完成"
cd ..

# 3. 生成 CRT 格式
echo "📝 生成 CRT 证书..."
cd sample-crt
cp ../sample-pem/private.key ./
cp ../sample-pem/certificate.pem ./certificate.crt

echo "✅ CRT 证书生成完成"
cd ..

# 4. 生成证书请求文件（CSR）用于测试
echo "📝 生成 CSR 文件..."
cd sample-pem
openssl req -new -key private.key -out request.csr \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=Test/OU=IT/CN=test.example.com"
cd ..

echo ""
echo "✅ 所有测试证书生成完成！"
echo ""
echo "生成的文件："
echo "  sample-pem/:"
ls -lh sample-pem/
echo ""
echo "  sample-pfx/:"
ls -lh sample-pfx/
echo ""
echo "  sample-crt/:"
ls -lh sample-crt/
