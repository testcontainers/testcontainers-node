const Docker = require('dockerode');

const docker = new Docker();
const containerIds = [];

const startContainer = async imageName => {
  console.log('starting container', imageName);
  const containerOpts = {
    Image: imageName,
    Tty: true,
    Cmd: []
  };
  const container = await docker.createContainer(containerOpts)
  const data = await container.start();
  containerIds.push(data.id);
  console.log('started container', imageName, 'with ID', data.id);

  console.log(await container.inspect());
};

const stopContainers = async () => {
  containerIds.forEach(async containerId => {
    console.log('stopping container', containerId);
    await docker.getContainer(containerId).stop();
    console.log('stopped container', containerId);
  });
};

(async () => {
  try {
    await startContainer('redis:alpine');
    await stopContainers();
  } catch (e) {
    console.error(e);
  }
})();
