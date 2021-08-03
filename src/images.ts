export const REAPER_IMAGE =
  process.env.RYUK_CONTAINER_IMAGE === undefined ? "testcontainers/ryuk:0.3.2" : process.env.RYUK_CONTAINER_IMAGE;

export const SSHD_IMAGE =
  process.env.SSHD_CONTAINER_IMAGE === undefined ? "testcontainers/sshd:1.0.0" : process.env.SSHD_CONTAINER_IMAGE;
