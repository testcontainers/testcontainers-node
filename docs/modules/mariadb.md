# MariaDB Module

[MariaDB](https://mariadb.org/) is one of the most popular open source relational databases. It’s made by the original developers of MySQL and guaranteed to stay open source. It is part of most cloud offerings and the default in most Linux distributions.



## Install

```bash
npm install @testcontainers/mariadb --save-dev
```

## Examples

<!--codeinclude-->
[Connect and execute query:](../../packages/modules/mariadb/src/mariadb-container.test.ts) inside_block:connect
<!--/codeinclude-->

<!--codeinclude-->
[Connect and execute query using URI:](../../packages/modules/mariadb/src/mariadb-container.test.ts) inside_block:uriConnect
<!--/codeinclude-->

<!--codeinclude-->
[Set username:](../../packages/modules/mariadb/src/mariadb-container.test.ts) inside_block:setUsername
<!--/codeinclude-->

<!--codeinclude-->
[Insert & fetch data:](../../packages/modules/mariadb/src/mariadb-container.test.ts) inside_block:insertAndFetchData
<!--/codeinclude-->
