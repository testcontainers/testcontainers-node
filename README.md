# TestContainers

> TestContainers is a NodeJS library that supports tests, providing lightweight, throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container.

[![Build Status](https://travis-ci.org/cristianrgreco/testcontainers-node.svg?branch=master)](https://travis-ci.org/cristianrgreco/testcontainers-node)

## Install

```bash
npm install testcontainers --save-dev
```

## Usage

```javascript
import { GenericContainer } from 'testcontainers';

it("returns 200 from Docker container over HTTP", async () => {
    const container = await new GenericContainer("tutum/hello-world")
        .withExposedPorts(80)
        .start();
        
    const response = await fetch(`http://localhost:${container.getMappedPort(80)}`);
    expect(response.status).toBe(200);
    
    await container.stop();
});
```