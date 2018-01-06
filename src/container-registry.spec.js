const ContainerRegistry = require('./container-registry')

describe('ContainerRegistry', () => {
  it('should register a container', () => {
    const container = { id: '1' }
    const containerRegistry = new ContainerRegistry({ containers: [] })
    containerRegistry.registerContainer(container)
    expect(containerRegistry.getContainers()).toEqual([container])
  })

  it('should unregister a container', () => {
    const container = { id: '1' }
    const containerRegistry = new ContainerRegistry({ containers: [container] })
    containerRegistry.unregisterContainer(container)
    expect(containerRegistry.getContainers()).toEqual([])
  })
})
