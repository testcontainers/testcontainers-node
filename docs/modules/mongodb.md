# MongoDB Module

[MongoDB](https://www.mongodb.com/) is an open source NoSQL database management program. NoSQL is used as an alternative to traditional relational databases. NoSQL databases are quite useful for working with large sets of distributed data. MongoDB is a tool that can manage document-oriented information, store or retrieve information.

## Install

```bash
npm install @testcontainers/mongodb --save-dev
```

## Examples

<!--codeinclude-->
[Connect:](../../packages/modules/mongodb/src/mongodb-container.test.ts) inside_block:connect
<!--/codeinclude-->

<!--codeinclude-->
[Connect with credentials:](../../packages/modules/mongodb/src/mongodb-container.test.ts) inside_block:connectWithCredentials
<!--/codeinclude-->
