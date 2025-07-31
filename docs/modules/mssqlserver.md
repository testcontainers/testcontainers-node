# MSSQL Server

## Install

```bash
npm install @testcontainers/mssqlserver --save-dev
```

## Examples

These examples use the following libraries:

- [mssql](https://www.npmjs.com/package/mssql)

        npm install mssql
        npm install @types/mssql --save-dev

Choose an image from the [container registry](https://mcr.microsoft.com/en-us/artifact/mar/mssql/server) and substitute `IMAGE`.

!!! warning "EULA Acceptance"
    Due to licencing restrictions you are required to accept an EULA for this container image. To indicate that you accept the MS SQL Server image EULA, call the `acceptLicense()` method.

    Please see the [`microsoft-mssql-server` image documentation](https://hub.docker.com/_/microsoft-mssql-server#environment-variables) for a link to the EULA document.

### Execute a query

<!--codeinclude-->
[](../../packages/modules/mssqlserver/src/mssqlserver-container.test.ts) inside_block:mssqlConnect
<!--/codeinclude-->

### Connect via URI

<!--codeinclude-->
[](../../packages/modules/mssqlserver/src/mssqlserver-container.test.ts) inside_block:mssqlUriConnect
<!--/codeinclude-->

### With password

<!--codeinclude-->
[](../../packages/modules/mssqlserver/src/mssqlserver-container.test.ts) inside_block:mssqlValidPassword
<!--/codeinclude-->

### With different edition

<!--codeinclude-->
[](../../packages/modules/mssqlserver/src/mssqlserver-container.test.ts) inside_block:mssqlExpressEdition
<!--/codeinclude-->
