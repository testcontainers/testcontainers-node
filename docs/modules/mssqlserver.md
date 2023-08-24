# MS SQL Server Module

[Microsoft SQL Server](https://www.microsoft.com/en-us/sql-server) is a relational database management system developed by Microsoft. It provides a platform for efficiently storing, managing, and retrieving structured data. MSSQL offers features for data storage, retrieval, manipulation, and analysis, making it a key component in various applications ranging from small-scale projects to enterprise-level systems.

## Install

```bash
npm install @testcontainers/mssqlserver --save-dev
```

## Examples

!!! warning "EULA Acceptance"
Due to licencing restrictions you are required to accept an EULA for this container image. To indicate that you accept the MS SQL Server image EULA, call the `acceptLicense()` method.

    Please see the [`microsoft-mssql-server` image documentation](https://hub.docker.com/_/microsoft-mssql-server#environment-variables) for a link to the EULA document.

<!--codeinclude-->

[Connect and execute query:](../../packages/modules/mssqlserver/src/mssqlserver-container.test.ts) inside_block:connect

<!--/codeinclude-->

<!--codeinclude-->

[Connect and execute query using URI:](../../packages/modules/mssqlserver/src/mssqlserver-container.test.ts) inside_block:uriConnect

<!--/codeinclude-->

<!--codeinclude-->

[Set password:](../../packages/modules/mssqlserver/src/mssqlserver-container.test.ts) inside_block:setPassword

<!--/codeinclude-->
