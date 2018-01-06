const ContainerManager = require('./container-manager')

describe('ContainerManager', () => {
  let mockDocker
  let mockImageManager
  let mockContainerRegistry
  let containerManager

  beforeEach(() => {
    mockDocker = jest.fn()
    mockImageManager = jest.fn()
    mockContainerRegistry = { getContainers: jest.fn() }

    containerManager = new ContainerManager({
      docker: mockDocker,
      imageManager: mockImageManager,
      containerRegistry: mockContainerRegistry
    })
  })

  it('should stop all containers', async () => {
    const container = { stop: jest.fn(() => Promise.resolve()) }
    const containers = [container]
    mockContainerRegistry.getContainers.mockReturnValueOnce(containers)

    await containerManager.stopContainers()

    expect(container.stop).toHaveBeenCalled()
  })
})
