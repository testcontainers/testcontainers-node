# Contributing

[Create an issue](https://github.com/testcontainers/testcontainers-node/issues) if you find any bugs.

[Create a pull request](https://github.com/testcontainers/testcontainers-node/pulls) if you wish to fix an issue or provide an enhancement. Please be sure to:
* Discuss with the authors via an issue or discussion prior to doing anything big.
* Follow the style, structure and naming conventions of the rest of the project.
* Make commits atomic and easy to merge.
* Run `npm run format` and `npm run lint` before committing.
* Verify the tests for what you changed are passing, for example `npx vitest run packages/modules/redis`. `npm test` runs every package and pulls every module's image.
* Give the pull request a short, imperative title that describes the change for users, such as `Add Mosquitto module` or `Fix container exec output truncation`, without `feat:` or `fix:` prefixes. Titles become the release notes. A maintainer will add the labels.

## Adding a module

[`.agents/skills/add-module/SKILL.md`](.agents/skills/add-module/SKILL.md) lists the conventions reviewers look for in a new module: the container class, tests, image pinning and docs.

## Coding agents

[`AGENTS.md`](AGENTS.md) holds the rules coding agents follow in this repository, and [`.agents/skills/`](.agents/skills) holds their workflows for opening and reviewing pull requests, adding modules and more. Both are also a short reference for human contributors.

## Documentation

The documentation is a static site built with [MkDocs](https://www.mkdocs.org/) and the [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) theme. In addition, we use a [custom plugin](https://github.com/rnorth/mkdocs-codeinclude-plugin) for inclusion of code snippets. We publish our documentation using Netlify.

### Updating the docs

To update the docs for your new module, you'll have to:
 - add a markdown file for your module in the docs/modules/ directory.
 - add a reference to your new markdown file in the mkdocs.yml file.

### Previewing rendered content

#### Using Docker

```shell
npm run docs:serve
```

Then access the docs at [http://localhost:8000](http://localhost:8000).

#### Using Python

* Ensure that you have Python 3.11.0 or higher.
* Set up a virtualenv and run `pip install -r requirements.txt` in the `testcontainers-node` root directory.
* Once Python dependencies have been installed, run `mkdocs serve` to start a local auto-updating MkDocs server.
* Run `mkdocs build --strict` to check for broken links, anchors and code includes. CI runs the same build on every pull request.

#### PR preview deployments

Documentation for pull requests will automatically be published by Netlify as "deploy previews". These deployment previews can be accessed via the `deploy/netlify` check that appears for each pull request.
