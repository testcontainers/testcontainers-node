declare module "dev-null" {
  import WritableStream = NodeJS.WritableStream;

  function devNull(): WritableStream;
  export = devNull;
}
