# SSLKit Usage Examples

This document provides practical examples of using SSLKit for various SSL certificate conversion scenarios.

## Installation

```bash
npm install -g sslkit
```

## Common Use Cases

### Example 1: Convert PEM to PFX for IIS/Windows

Scenario: You have a PEM certificate from Let's Encrypt and need to deploy it on IIS.

```bash
# Your files: certificate.pem, private.key
cd /path/to/cert/directory

# Convert to PFX
sslkit -m pfx -d . -p YourSecurePassword -o iis_certificate

# Output files:
# - iis_certificate.pfx
# - pfx-password.txt
```

### Example 2: Convert PFX to PEM for Nginx

Scenario: You have a PFX from Windows and need to use it on a Linux Nginx server.

```bash
# Your file: certificate.pfx
cd /path/to/cert/directory

# Convert to PEM
sslkit -m pem -d . -p PfxPassword -o nginx_cert

# Output files:
# - nginx_cert.pem (certificate)
# - nginx_cert.key (private key)
# - nginx_cert_combined.pem (both in one file)
```

### Example 3: Convert PEM to CRT for Apache

Scenario: You need Apache-compatible certificates from PEM files.

```bash
# Your files: certificate.pem, private.key
cd /path/to/cert/directory

# Convert to CRT
sslkit -m crt -d . -o apache_cert

# Output files:
# - apache_cert.crt
# - apache_cert.key
```

### Example 4: Convert PFX to JKS for Tomcat

Scenario: You need a Java KeyStore for your Tomcat application.

```bash
# Your file: certificate.pfx
cd /path/to/cert/directory

# Convert to JKS
sslkit -m jks -d . -p KeystorePassword -o tomcat_keystore

# Output files:
# - tomcat_keystore.jks
# - jks-password.txt
```

## Advanced Examples

### Example 5: Using Custom OpenSSL Path

If OpenSSL is not in your PATH:

```bash
sslkit -m pfx -d ./certs --openssl-path "/usr/local/bin/openssl" -p password
```

### Example 6: Batch Conversion Script

Convert multiple certificates in different directories:

```bash
#!/bin/bash

# Array of certificate directories
dirs=("./cert1" "./cert2" "./cert3")

# Convert each to PFX
for dir in "${dirs[@]}"; do
    echo "Processing $dir..."
    sslkit -m pfx -d "$dir" -p "SecurePassword123" -o "certificate_$(basename $dir)"
done
```

### Example 7: Automating with npm scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "cert:pfx": "sslkit -m pfx -d ./ssl -p $CERT_PASSWORD -o server",
    "cert:pem": "sslkit -m pem -d ./ssl -p $CERT_PASSWORD -o server",
    "cert:jks": "sslkit -m jks -d ./ssl -p $CERT_PASSWORD -o server"
  }
}
```

Then run:

```bash
CERT_PASSWORD=yourpassword npm run cert:pfx
```

## Server Configuration Examples

### Nginx Configuration (PEM)

After generating `nginx_cert.pem` and `nginx_cert.key`:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/nginx/ssl/nginx_cert.pem;
    ssl_certificate_key /etc/nginx/ssl/nginx_cert.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        root /var/www/html;
        index index.html;
    }
}
```

### Apache Configuration (CRT)

After generating `apache_cert.crt` and `apache_cert.key`:

```apache
<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile /etc/apache2/ssl/apache_cert.crt
    SSLCertificateKeyFile /etc/apache2/ssl/apache_cert.key

    SSLProtocol all -SSLv2 -SSLv3
    SSLCipherSuite HIGH:MEDIUM:!aNULL:!MD5:!SEED:!IDEA
</VirtualHost>
```

### Tomcat Configuration (JKS)

After generating `tomcat_keystore.jks`:

```xml
<!-- server.xml -->
<Connector port="8443"
           protocol="org.apache.coyote.http11.Http11NioProtocol"
           maxThreads="150"
           SSLEnabled="true"
           scheme="https"
           secure="true"
           keystoreFile="/path/to/tomcat_keystore.jks"
           keystorePass="yourPassword"
           keystoreType="JKS"
           clientAuth="false"
           sslProtocol="TLS"/>
```

### IIS Configuration (PFX)

1. Open IIS Manager
2. Select your server in the Connections pane
3. Double-click "Server Certificates"
4. Click "Import" in the Actions pane
5. Browse to `iis_certificate.pfx`
6. Enter the password from `pfx-password.txt`
7. Select "Web Hosting" as the certificate store
8. Bind the certificate to your website

## Troubleshooting

### Error: OpenSSL not found

```bash
# Check OpenSSL installation
which openssl
openssl version

# If not found, install:
# macOS:
brew install openssl

# Ubuntu/Debian:
sudo apt-get install openssl
```

### Error: Keytool not found (JKS conversion)

```bash
# Check Java installation
which keytool
java -version

# If not found, install JDK:
# macOS:
brew install openjdk

# Ubuntu/Debian:
sudo apt-get install default-jdk
```

### Error: Cannot find certificate files

Make sure your certificate files are in the specified directory:

```bash
ls -la /path/to/cert/directory
```

Expected files:

- `.pem` or `.crt` or `.cer` for certificate
- `.key` for private key
- `.pfx` for PKCS12 bundle

## Best Practices

1. **Keep passwords secure**: Don't commit password files to version control
2. **Use strong passwords**: Minimum 8 characters with mixed case and symbols
3. **Backup certificates**: Always keep backups of your certificates and keys
4. **Test first**: Test certificate conversion in a staging environment
5. **File permissions**: Restrict certificate file permissions (chmod 600)

## Security Notes

- Never share your private key files
- Store password files separately from certificates in production
- Use environment variables for passwords in automated scripts
- Rotate certificates before they expire
- Use strong encryption (TLS 1.2+)

## Support

For issues and questions:

- GitHub: https://github.com/Alioth1017/sslkit
- Report bugs: https://github.com/Alioth1017/sslkit/issues
