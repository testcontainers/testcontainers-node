# Neo4j Module

[Neo4j](https://neo4j.com/) is a highly scalable, robust native graph database.

## Install

```bash
npm install @testcontainers/neo4j --save-dev
```

## Examples

<!--codeinclude-->
[Connect and create a node:](../../src/modules/neo4j/src/neo4j-container.test.ts) inside_block:createNode
<!--/codeinclude-->

<!--codeinclude-->
[Set password:](../../src/modules/neo4j/src/neo4j-container.test.ts) inside_block:setPassword
<!--/codeinclude-->

<!--codeinclude-->
[Configure APOC:](../../src/modules/neo4j/src/neo4j-container.test.ts) inside_block:apoc
<!--/codeinclude-->
