# GCloud Module

Testcontainers module for the Google Cloud Platform's [Cloud SDK](https://cloud.google.com/sdk/).

## Install

```bash
npm install @testcontainers/gcloud --save-dev
```


Currently, the module supports `Firestore` emulators. In order to use it, you should use the following classes:

Class | Container Image
-|-
FirestoreEmulatorContainer | [gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators](https://gcr.io/google.com/cloudsdktool/google-cloud-cli)

## Examples

### Firestore

<!--codeinclude-->
[Starting a Firestore Emulator container with the default image](../../packages/modules/gcloud/src/firestore-emulator-container.test.ts) inside_block:firestore4
<!--/codeinclude-->

<!--codeinclude-->
[Starting a Firestore Emulator container with a custom emulator image](../../packages/modules/gcloud/src/firestore-emulator-container.test.ts) inside_block:firestore5
<!--/codeinclude-->
