# GCloud Module

Testcontainers module for the Google Cloud Platform's [Cloud SDK](https://cloud.google.com/sdk/).

## Install

```bash
npm install @testcontainers/gcloud --save-dev
```

Currently, the module supports `Firestore` emulators in Native mode and Datastore mode. In order to use them, you should use the following classes:

Mode | Class | Container Image
-|-|-
Native mode | FirestoreEmulatorContainer | [gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators](https://gcr.io/google.com/cloudsdktool/google-cloud-cli)
Datastore mode | DatastoreEmulatorContainer | [gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators](https://gcr.io/google.com/cloudsdktool/google-cloud-cli)

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
