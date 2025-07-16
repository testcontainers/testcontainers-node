# Vault Module

[Vault](https://www.vaultproject.io/) by HashiCorp is a tool for securely accessing secrets such as API keys, passwords, or certificates. This module allows you to run and initialize a Vault container for integration tests.

## Install

```bash
npm install @testcontainers/vault --save-dev
```

## Examples

<!--codeinclude-->

[Start and perform read/write with node-vault:](../../packages/modules/vault/src/vault-container.test.ts) inside_block:readWrite

<!--/codeinclude-->

<!--codeinclude-->

[Run Vault CLI init commands at startup:](../../packages/modules/vault/src/vault-container.test.ts) inside_block:initCommands

<!--/codeinclude-->

## Why use Vault in integration tests?

With the growing adoption of Vault in modern infrastructure, testing components that depend on Vault for secret resolution or encryption can be complex. This module allows:

- Starting a local Vault instance during test runs
- Seeding secrets or enabling engines with Vault CLI
- Validating app behavior with secured data access

Use this module to test Vault-backed workflows without the need for pre-provisioned Vault infrastructure.
