# GCloud Module

Testcontainers module for the Google Cloud Platform's [Cloud SDK](https://cloud.google.com/sdk/).

## Install

```bash
npm install @testcontainers/gcloud --save-dev
```

The module now supports multiple emulators, including `firestore`, which offers both `native` and `datastore` modes.
To utilize these emulators, you should employ the following classes:

Mode | Class | Container Image
-|-|-
Firestore Native mode | FirestoreEmulatorContainer | [gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators](https://gcr.io/google.com/cloudsdktool/google-cloud-cli)
Firestore Datastore mode | DatastoreEmulatorContainer | [gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators](https://gcr.io/google.com/cloudsdktool/google-cloud-cli)
Cloud PubSub mode |PubSubEmulatorContainer | [gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators](https://gcr.io/google.com/cloudsdktool/google-cloud-cli)
Cloud Storage mode |CloudStorageEmulatorContainer | [https://hub.docker.com/r/fsouza/fake-gcs-server](https://hub.docker.com/r/fsouza/fake-gcs-server)

## Examples

### Firestore Native mode

<!--codeinclude-->
[Starting a Firestore Emulator container with the default image](../../packages/modules/gcloud/src/firestore-emulator-container.test.ts) inside_block:firestore4
<!--/codeinclude-->

<!--codeinclude-->
[Starting a Firestore Emulator container with a custom emulator image](../../packages/modules/gcloud/src/firestore-emulator-container.test.ts) inside_block:firestore5
<!--/codeinclude-->

### Firestore Datastore mode

<!--codeinclude-->
[Starting a Datastore Emulator container with the default image](../../packages/modules/gcloud/src/datastore-emulator-container.test.ts) inside_block:datastore4
<!--/codeinclude-->

<!--codeinclude-->
[Starting a Datastore Emulator container with a custom emulator image](../../packages/modules/gcloud/src/datastore-emulator-container.test.ts) inside_block:datastore5
<!--/codeinclude-->

### Cloud PubSub mode

<!--codeinclude-->
[Starting a Cloud PubSub Emulator container with the default image](../../packages/modules/gcloud/src/pubsub-emulator-container.test) inside_block:pubsub6
<!--/codeinclude-->

### Cloud Storage mode

The Cloud Storage mode doesn't rely on a built-in emulator created by Google but instead depends on a fake Cloud Storage server implemented by [Francisco Souza](https://github.com/fsouza). The project is open-source, and the repository can be found at [fsouza/fake-gcs-server](https://github.com/fsouza/fake-gcs-server).
<!--codeinclude-->
[Starting a Cloud Storage Emulator container with the default image](../../packages/modules/gcloud/src/cloudstorage-emulator-container.test.ts) inside_block:cloudstorage7
<!--/codeinclude-->
