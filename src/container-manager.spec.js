const ContainerManager = require('./container-manager')

describe('ContainerManager', () => {
  let mockDocker
  let mockImageManager
  let mockContainerRegistry
  let containerManager

  beforeEach(() => {
    mockDocker = { createContainer: jest.fn() }
    mockImageManager = { pull: jest.fn(), exists: jest.fn() }
    mockContainerRegistry = {
      registerContainer: jest.fn(),
      getContainers: jest.fn()
    }

    containerManager = new ContainerManager({
      docker: mockDocker,
      imageManager: mockImageManager,
      containerRegistry: mockContainerRegistry
    })

    const mockInspect = { Config: { id: '1' } }
    const mockContainer = { start: jest.fn(), inspect: jest.fn(() => mockInspect) }
    mockDocker.createContainer.mockReturnValueOnce(Promise.resolve(mockContainer))
  })

  it('should start a container', async () => {
    mockImageManager.exists.mockReturnValueOnce(Promise.resolve(true))

    const container = await containerManager.startContainer({ image: 'image' })

    expect(container).toEqual({ id: '1' })
    expect(mockImageManager.pull).not.toHaveBeenCalled()
    expect(mockContainerRegistry.registerContainer).toHaveBeenCalled()
  })

  it('should pull the image if it does not exist', async () => {
    mockImageManager.exists.mockReturnValueOnce(Promise.resolve(false))

    const container = await containerManager.startContainer({ image: 'image:alpine' })

    expect(container).toEqual({ id: '1' })
    expect(mockImageManager.pull).toHaveBeenCalledWith('image:alpine')
    expect(mockContainerRegistry.registerContainer).toHaveBeenCalled()
  })

  it('should pull the latest image version if one is not specified', async () => {
    mockImageManager.exists.mockReturnValueOnce(Promise.resolve(false))

    const container = await containerManager.startContainer({ image: 'image' })

    expect(container).toEqual({ id: '1' })
    expect(mockImageManager.pull).toHaveBeenCalledWith('image:latest')
    expect(mockContainerRegistry.registerContainer).toHaveBeenCalled()
  })

  it('should stop all containers', async () => {
    const container = { stop: jest.fn(() => Promise.resolve()) }
    const containers = [container]
    mockContainerRegistry.getContainers.mockReturnValueOnce(containers)

    await containerManager.stopContainers()

    expect(container.stop).toHaveBeenCalled()
  })
})
