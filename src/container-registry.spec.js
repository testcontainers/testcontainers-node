const ContainerRegistry = require('./container-registry')

describe('ContainerRegistry', () => {
  let containerRegistry

  beforeEach(() => {
    containerRegistry = new ContainerRegistry({ containers: [] })
  })

  it('should register a container', () => {
    const container = { id: '1' }
    containerRegistry.registerContainer(container)
    expect(containerRegistry.getContainers()).toEqual([container])
  })
})
