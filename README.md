# TestContainers

> TestContainers is a NodeJS library that supports tests, providing lightweight, throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container.

[![Build Status](https://travis-ci.org/cristianrgreco/testcontainers-node.svg?branch=master)](https://travis-ci.org/cristianrgreco/testcontainers-node)

## Install

```bash
npm i -D testcontainers
```

## Usage

```javascript
import fetch from "node-fetch";
import { GenericContainer } from "testcontainers";

test("should return 200 from docker container over http", async () => {
    const container = await new GenericContainer("tutum/hello-world")
        .withExposedPorts(80)
        .start();
       
    const url = `http://localhost:${container.getMappedPort(80)}`;
    const response = await fetch(url);
    expect(response.status).toBe(200);
    
    await container.stop();
}); 
```
