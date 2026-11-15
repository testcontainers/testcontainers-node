# Releasing

## Publishing a release

Release Drafter keeps a draft GitHub release up to date as PRs merge. To release, publish the draft on GitHub.

That runs the `Node.js Package` workflow (`.github/workflows/npm-publish.yml`), which:

1. Sets every package to the release version and builds it.
2. Checks every package that is already on npm has a trusted publisher.
3. Pushes the version commit to `main`.
4. Publishes every package to npm.

If the `Check packages` step fails, nothing has been pushed or published. Fix what it reports and re-run the job.

## Dry run

Run the workflow by hand from Actions → Node.js Package → Run workflow, or with:

```bash
gh workflow run npm-publish.yml --ref main -f version=<version>
```

Use the draft release's version, and the branch you want to check. The dry run does everything a release does except commit, push and publish. It fails if a package on npm has no trusted publisher, and warns about packages that aren't on npm yet.

## Trusted publishing

The workflow publishes with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), so there is no npm token. Every package needs a trusted publisher for the workflow. You can add one on npmjs.com, under the package's Settings → Trusted publishing → GitHub Actions:

- Organization or user: `testcontainers`
- Repository: `testcontainers-node`
- Workflow filename: `npm-publish.yml`
- Environment: leave empty

Or add one from the command line. `npx npm@latest` runs a recent npm without changing yours:

```bash
npx npm@latest trust github <package> --file npm-publish.yml --repo testcontainers/testcontainers-node --allow-publish --yes
```

To add several in a row, tick "skip two-factor authentication for the next 5 minutes" when npm first asks for 2FA in the browser, and wait 2 seconds between packages to avoid npm's rate limit:

```bash
for name in $(jq -r .name packages/testcontainers/package.json packages/modules/*/package.json); do
  npx npm@latest trust github "$name" --file npm-publish.yml --repo testcontainers/testcontainers-node --allow-publish --yes
  sleep 2
done
```

To see a package's trusted publishers:

```bash
npx npm@latest trust list <package>
```

npm deletes a trusted publisher that hasn't published anything within 2 days of being added. Add one in the 2 days before the release that will first use it. Once a release has published through it, it stays.

## Adding a new module

npm trusted publishing can't create a package, so a new module's first version is published by hand from the tarball the release builds:

1. Publish the release as usual. The workflow publishes every other package and warns that the new module isn't on npm yet. Its tarball is in the run's `unpublished-packages` artifact.
2. Log in with `npm login`, then download and publish the tarball. Nothing is built locally.

   ```bash
   gh run download <run-id> --repo testcontainers/testcontainers-node -n unpublished-packages
   npm publish testcontainers-<module>-<version>.tgz
   ```

3. In the 2 days before the next release, add the module's trusted publisher.

## If a package fails to publish

If a package fails to publish during a release, the workflow puts its tarball in the `unpublished-packages` artifact as well. Publish it the same way as a new module, and check its trusted publisher before the next release.
