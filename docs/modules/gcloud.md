# GCloud

## Install

```bash
npm install @testcontainers/gcloud --save-dev
```

## Examples

### Firestore

These examples use the following libraries:

- [@google-cloud/firestore](https://www.npmjs.com/package/@google-cloud/firestore)

        npm install @google-cloud/firestore

Choose an image from the [container registry](https://gcr.io/google.com/cloudsdktool/google-cloud-cli) and substitute `IMAGE`.

<!--codeinclude-->
[](../../packages/modules/gcloud/src/firestore-emulator-container.test.ts) inside_block:firestoreExample 
<!--/codeinclude-->

---
 
### Datastore

These examples use the following libraries:

- [@google-cloud/datastore](https://www.npmjs.com/package/@google-cloud/datastore)

        npm install @google-cloud/datastore

Choose an image from the [container registry](https://gcr.io/google.com/cloudsdktool/google-cloud-cli) and substitute `IMAGE`.
 
<!--codeinclude-->
[](../../packages/modules/gcloud/src/datastore-emulator-container.test.ts) inside_block:datastoreExample
<!--/codeinclude-->
 
---

### Cloud PubSub

These examples use the following libraries:

- [@google-cloud/pubsub](https://www.npmjs.com/package/@google-cloud/pubsub)

        npm install @google-cloud/pubsub

Choose an image from the [container registry](https://gcr.io/google.com/cloudsdktool/google-cloud-cli) and substitute `IMAGE`.

<!--codeinclude-->
[](../../packages/modules/gcloud/src/pubsub-emulator-container.test.ts) inside_block:pubsubExample
<!--/codeinclude-->

---

### Cloud Storage

These examples use the following libraries:

- [@google-cloud/storage](https://www.npmjs.com/package/@google-cloud/storage)

        npm install @google-cloud/storage

Choose an image from the [container registry](https://hub.docker.com/r/fsouza/fake-gcs-server) and substitute `IMAGE`.

<!--codeinclude-->
[](../../packages/modules/gcloud/src/cloudstorage-emulator-container.test.ts) inside_block:cloudstorageExample
<!--/codeinclude-->

---

### Cloud Spanner

These examples use the following libraries:

- [@google-cloud/datastore](https://www.npmjs.com/package/@google-cloud/datastore)

        npm install @google-cloud/datastore

Choose an image from the [container registry](https://gcr.io/cloud-spanner-emulator/emulator:1.5.37) and substitute `IMAGE`.

#### Default

<!--codeinclude-->
[](../../packages/modules/gcloud/src/spanner-emulator-container.test.ts) inside_block:startupWithExplicitClient
<!--/codeinclude-->

#### With environment variable

<!--codeinclude-->
[](../../packages/modules/gcloud/src/spanner-emulator-container.test.ts) inside_block:startupWithEnvironmentVariable
<!--/codeinclude-->

#### Helper

<!--codeinclude-->
[](../../packages/modules/gcloud/src/spanner-emulator-helper.test.ts) inside_block:createAndDelete
<!--/codeinclude-->

---

### BigQuery

These examples use the following libraries:

- [@google-cloud/bigquery](https://www.npmjs.com/package/@google-cloud/bigquery)

        npm install @google-cloud/bigquery

Choose an image from the [container registry](https://ghcr.io/goccy/bigquery-emulator) and substitute `IMAGE`.

<!--codeinclude-->
[](../../packages/modules/gcloud/src/bigquery-emulator-container.test.ts)  inside_block:bigqueryExample
<!--/codeinclude-->
