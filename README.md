# TestContainers

> TestContainers is a NodeJS library that supports tests, providing lightweight, 
throwaway instances of common databases, Selenium web browsers, or anything else that can run in a Docker container.

## Usage

```
const containerManager = require('testcontainers')

describe('TestSubject', () => {
  let mongo
  let redis

  let testSubject

  before(async () => {
    mongo = await containerManager.startContainer({ image: 'mongo' })
    redis = await containerManager.startContainer({ image: 'redis:alpine' })
  })

  after(async () => {
    await containerManager.stopContainers()
  })

  beforeEach(() => {
    testSubject = new TestSubject({ 
      mongoConfig: { host: mongo.host, port: mongo.port } ,
      redisConfig: { host: redis.host, port: redis.port } 
    })
  })
})
```
