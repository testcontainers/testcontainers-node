# MySQL Module

[MySQL](https://www.mysql.com/) is the world's most popular open source database. With its proven performance, reliability and ease-of-use, MySQL has become the leading database choice for web-based applications, covering the entire range from personal projects and websites, via e-commerce and information services, all the way to high profile web properties including Facebook, Twitter, YouTube, Yahoo! and many more.

## Install

```bash
npm install @testcontainers/mysql --save-dev
```

## Examples

<!--codeinclude-->
[Connect and execute query:](../../packages/modules/mysql/src/mysql-container.test.ts) inside_block:connect
<!--/codeinclude-->

<!--codeinclude-->
[Connect and execute query using URI:](../../packages/modules/mysql/src/mysql-container.test.ts) inside_block:uriConnect
<!--/codeinclude-->

<!--codeinclude-->
[Set username:](../../packages/modules/mysql/src/mysql-container.test.ts) inside_block:setUsername
<!--/codeinclude-->

<!--codeinclude-->
[Execute a query inside the container:](../../packages/modules/mysql/src/mysql-container.test.ts) inside_block:executeQuery
<!--/codeinclude-->
