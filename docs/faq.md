# FAQ

#### Some docker features isn't supported when running rootless.

Errors example:

- `NanoCPUs can not be set, as your kernel does not support CPU CFS scheduler or the cgroup is not mounted`
- `(HTTP code 500) server error - crun: the requested cgroup controller `cpu` is not available: OCI runtime error`

So in tests it may be required to wrap your case by condition like this:

```ts
if (!process.env["CI_ROOTLESS"]) {
  it('my case', () => {})
}
```
