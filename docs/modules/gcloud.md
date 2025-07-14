# GCloud Module

Testcontainers module for the Google Cloud Platform's [Cloud SDK](https://cloud.google.com/sdk/).

## Install

```bash
npm install @testcontainers/gcloud --save-dev
```

The module supports multiple emulators. Use the following classes:

Emulator | Class | Container Image
-|-|-
Firestore (Native mode) | FirestoreEmulatorContainer | [gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators](https://gcr.io/google.com/cloudsdktool/google-cloud-cli)
Firestore (Datastore mode) | DatastoreEmulatorContainer | [gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators](https://gcr.io/google.com/cloudsdktool/google-cloud-cli)
Cloud PubSub | PubSubEmulatorContainer | [gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators](https://gcr.io/google.com/cloudsdktool/google-cloud-cli)
Cloud Storage | CloudStorageEmulatorContainer | [fsouza/fake-gcs-server:1.52.2](https://hub.docker.com/r/fsouza/fake-gcs-server)
BigQuery | BigQueryEmulatorContainer | [ghcr.io/goccy/bigquery-emulator:0.6.6](https://ghcr.io/goccy/bigquery-emulator)
Cloud Spanner | SpannerEmulatorContainer | [gcr.io/cloud-spanner-emulator/emulator:1.5.37](https://gcr.io/cloud-spanner-emulator/emulator:1.5.37)

## Examples

### Firestore (Native mode)

<!--codeinclude-->
[Starting a Firestore Emulator container with the default image](../../packages/modules/gcloud/src/firestore-emulator-container.test.ts) inside_block:firestore4
<!--/codeinclude-->

<!--codeinclude-->
[Starting a Firestore Emulator container with a custom emulator image](../../packages/modules/gcloud/src/firestore-emulator-container.test.ts) inside_block:firestore5
<!--/codeinclude-->

### Firestore (Datastore mode)

<!--codeinclude-->
[Starting a Datastore Emulator container with the default image](../../packages/modules/gcloud/src/datastore-emulator-container.test.ts) inside_block:datastore4
<!--/codeinclude-->

<!--codeinclude-->
[Starting a Datastore Emulator container with a custom emulator image](../../packages/modules/gcloud/src/datastore-emulator-container.test.ts) inside_block:datastore5
<!--/codeinclude-->

### Cloud PubSub

<!--codeinclude-->
[Starting a Cloud PubSub Emulator container with the default image](../../packages/modules/gcloud/src/pubsub-emulator-container.test.ts)
<!--/codeinclude-->

### Cloud Storage

The Cloud Storage container uses a fake Cloud Storage server by [Francisco Souza](https://github.com/fsouza).

<!--codeinclude-->
[Starting a Cloud Storage Emulator container with the default image](../../packages/modules/gcloud/src/cloudstorage-emulator-container.test.ts) inside_block:cloud-storage
<!--/codeinclude-->

### BigQuery

The BigQuery emulator is by [Masaaki Goshima](https://github.com/goccy) and uses [go-zetasqlite](https://github.com/goccy/go-zetasqlite).

<!--codeinclude-->
[Starting a BigQuery Emulator container with the default image](../../packages/modules/gcloud/src/bigquery-emulator-container.test.ts)
<!--/codeinclude-->

### Cloud Spanner

The Cloud Spanner emulator container wraps Google's official emulator image. It exposes gRPC and HTTP ports, and provides a `helper` for instance/database operations.

<!--codeinclude-->
[Starting a Spanner Emulator container and exposing endpoints](../../packages/modules/gcloud/src/spanner-emulator-container.test.ts) inside_block:startup
<!--/codeinclude-->

<!--codeinclude-->
[Creating and deleting instance and database via helper](../../packages/modules/gcloud/src/spanner-emulator-container.test.ts) inside_block:createAndDelete
<!--/codeinclude-->
