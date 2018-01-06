# TestContainers

> TestContainers is a NodeJS library that supports tests, providing lightweight, throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container.

[![Build Status](https://travis-ci.org/cristianrgreco/testcontainers-node.svg?branch=master)](https://travis-ci.org/cristianrgreco/testcontainers-node)

## Usage

```javascript
const testContainers = require('testcontainers')

describe('TestSubject', () => {
  let mongo, redis
  let testSubject

  before(async () => {
    mongo = await testContainers.startContainer({ image: 'mongo' })
    redis = await testContainers.startContainer({ image: 'redis:alpine' })
  })

  after(async () => {
    await testContainers.stopContainers()
  })

  beforeEach(() => {
    testSubject = new TestSubject({ 
      mongoConfig: { host: mongo.host, port: mongo.port } ,
      redisConfig: { host: redis.host, port: redis.port } 
    })
  })
})
```
