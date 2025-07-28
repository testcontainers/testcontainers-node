# Neo4j

## Install

```bash
npm install @testcontainers/neo4j --save-dev
```

## Examples

These examples use the following libraries:

- [neo4j-driver](https://www.npmjs.com/package/neo4j-driver)

        npm install neo4j-driver

Choose an image from the [container registry](https://hub.docker.com/_/neo4j) and substitute `IMAGE`.

### Create a node

<!--codeinclude-->
[](../../packages/modules/neo4j/src/neo4j-container.test.ts) inside_block:createNode
<!--/codeinclude-->

### With credentials

<!--codeinclude-->
[](../../packages/modules/neo4j/src/neo4j-container.test.ts) inside_block:setPassword
<!--/codeinclude-->

### With APOC

<!--codeinclude-->
[](../../packages/modules/neo4j/src/neo4j-container.test.ts) inside_block:apoc
<!--/codeinclude-->

### With plugins

<!--codeinclude-->
[](../../packages/modules/neo4j/src/neo4j-container.test.ts) inside_block:pluginsList
<!--/codeinclude-->
