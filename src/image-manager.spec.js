const ImageManager = require('./image-manager')

describe('ImageManager', () => {
  let mockDocker
  let imageManager

  beforeEach(() => {
    mockDocker = { listImages: jest.fn(), pull: jest.fn() }
    imageManager = new ImageManager({ docker: mockDocker })
  })

  it('should return true if an image exists', async () => {
    mockDocker.listImages.mockReturnValueOnce([ { RepoTags: [ 'image:latest' ] } ])
    expect(await imageManager.exists('image')).toBe(true)
  })

  it('should return false if an image does not exist', async () => {
    mockDocker.listImages.mockReturnValueOnce([ { RepoTags: [ 'image:latest' ] } ])
    expect(await imageManager.exists('anotherImage')).toBe(false)
  })

  it('should pull an image', async () => {
    const mockStream = {
      pipe: jest.fn(),
      once: jest.fn((key, callback) => key === 'end' && callback())
    }
    mockDocker.pull.mockImplementation((image, callback) => callback(null, mockStream))

    await imageManager.pull('image')

    expect(mockDocker.pull.mock.calls[0][0]).toEqual('image')
  })
})
