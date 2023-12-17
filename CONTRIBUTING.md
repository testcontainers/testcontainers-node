# Contributing

[Create an issue](https://github.com/testcontainers/testcontainers-node/issues) if you find any bugs.

[Create a pull request](https://github.com/testcontainers/testcontainers-go/pulls) if you wish to fix an issue or provide an enhancement. Please be sure to:
* Discuss with the authors on an issue ticket or discussion prior to doing anything big.
* Follow the style, structure and naming conventions of the rest of the project.
* Make commits atomic and easy to merge.
* Run the Git hooks when making commits to ensure the code is linted and correctly formatted.
* Verify all tests are passing with `npm test`

## Documentation

The documentation is a static site built with [MkDocs](https://www.mkdocs.org/). We use the [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) theme, which offers a number of useful extensions to MkDocs.

In addition, we use a [custom plugin](https://github.com/rnorth/mkdocs-codeinclude-plugin) for inclusion of code snippets.

We publish our documentation using Netlify.

### Previewing rendered content

#### Using Docker locally

The root of the project contains a `docker-compose.yml` file. Simply run `docker-compose up` and then access the docs at [http://localhost:8000](http://localhost:8000).

#### Using Python locally

* Ensure that you have Python 3.8.0 or higher.
* Set up a virtualenv and run `pip install -r requirements.txt` in the `testcontainers-java` root directory.
* Once Python dependencies have been installed, run `mkdocs serve` to start a local auto-updating MkDocs server.

#### PR Preview deployments

Note that documentation for pull requests will automatically be published by Netlify as 'deploy previews'.
These deployment previews can be accessed via the `deploy/netlify` check that appears for each pull request.
