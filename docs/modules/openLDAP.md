# OpenLDAP Module

[OpenLDAP](https://www.openldap.org/) is an open-source implementation of the LDAP protocol, enabling hierarchical storage and management of directory information.

## Install

```bash
npm install @testcontainers/openldap --save-dev
```

## Examples

<!--codeinclude-->
[Start container:](../../packages/modules/openldap/src/openldap-container.test.ts) inside_block:startContainer
<!--/codeinclude-->

<!--codeinclude-->
[Connect openldap client to container:](../../packages/modules/openldap/src/openldap-container.test.ts) inside_block:simpleConnect
<!--/codeinclude-->

<!--codeinclude-->
[Start container with password authentication:](../../packages/modules/openldap/src/openldap-container.test.ts) inside_block:startWithCredentials
<!--/codeinclude-->

<!--codeinclude-->
[Define volume for persistent/predefined data:](../../packages/modules/openldap/src/openldap-container.test.ts) inside_block:persistentData
<!--/codeinclude-->

<!--codeinclude-->
[Execute a command inside the container:](../../packages/modules/openldap/src/openldap-container.test.ts) inside_block:executeCommand
<!--/codeinclude-->
