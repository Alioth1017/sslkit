# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-11-24

### Added

- ✨ **PEM Generator**: Full implementation for converting PFX to PEM format
  - Extract certificate and private key from PFX
  - Generate combined PEM file with both certificate and key
  - Support for existing PEM files
- ✨ **CRT Generator**: Full implementation for Apache-compatible certificates
  - Convert PEM/PFX to CRT format
  - Automatic private key extraction
  - Apache configuration examples in output
- ✨ **JKS Generator**: Full implementation for Java KeyStore generation
  - Convert PFX to JKS format for Tomcat/Java applications
  - Automatic PFX creation from PEM+KEY if needed
  - Tomcat configuration examples in output
- 🔍 **Validator Module**: Comprehensive pre-flight checks
  - OpenSSL availability verification
  - Keytool availability check (for JKS)
  - Directory access validation
  - Password strength validation
  - Mode validation
  - File existence warnings
- 🎨 **Enhanced Utilities**: Improved logging and error handling
  - Color-coded log messages (success, error, warning, info)
  - Better error filtering for OpenSSL output
  - File size formatting
  - Safe file deletion utilities
- 📚 **Comprehensive Documentation**:
  - Detailed README with installation and usage instructions
  - Chinese version (README_zh.md)
  - Examples file (EXAMPLES.md) with practical use cases
  - Server configuration examples
  - Troubleshooting guide
- 📝 **License File**: Added ISC license
- 🔧 **Package Improvements**:
  - Updated keywords for better discoverability
  - Enhanced description
  - Better npm metadata

### Changed

- 🔄 **Enhanced PFX Generator**:
  - Auto-convert CRT/CER to PEM before PFX generation
  - Better error messages and user feedback
- 🔄 **Improved Base Generator**:
  - More robust file detection with regex patterns
  - Better certificate type identification
  - Enhanced error handling

### Fixed

- 🐛 Fixed OpenSSL stderr output handling (some normal outputs were shown as errors)
- 🐛 Improved file path handling across platforms
- 🐛 Better certificate block detection regex patterns

## [1.0.2] - 2024 (Previous Version)

### Added

- Basic PFX generator functionality
- CLI interface with Commander.js
- Basic file detection

## [1.0.0] - Initial Release

### Added

- Project structure
- Basic certificate generation framework
- CLI template
