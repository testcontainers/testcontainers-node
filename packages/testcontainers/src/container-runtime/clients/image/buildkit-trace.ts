type Field = { number: number; value: number | Buffer };

const STATUS_VERTEXES = 1;
const STATUS_LOGS = 3;
const VERTEX_NAME = 3;
const VERTEX_STARTED = 5;
const VERTEX_COMPLETED = 6;
const VERTEX_LOG_MSG = 4;

// BuildKit reports progress as base64 encoded protobuf StatusResponse messages:
// https://github.com/moby/buildkit/blob/master/api/services/control/control.proto
export function decodeBuildkitTrace(trace: string): string {
  let output = "";

  for (const status of readFields(Buffer.from(trace, "base64"))) {
    if (!Buffer.isBuffer(status.value)) {
      continue;
    }
    const fields = readFields(status.value);
    const find = (number: number) => fields.find((field) => field.number === number)?.value;

    if (status.number === STATUS_VERTEXES) {
      const name = find(VERTEX_NAME);
      if (Buffer.isBuffer(name) && find(VERTEX_STARTED) !== undefined && find(VERTEX_COMPLETED) === undefined) {
        output += `${name.toString("utf-8")}\n`;
      }
    } else if (status.number === STATUS_LOGS) {
      const msg = find(VERTEX_LOG_MSG);
      if (Buffer.isBuffer(msg)) {
        output += msg.toString("utf-8");
      }
    }
  }

  return output;
}

function readFields(buffer: Buffer): Field[] {
  const fields: Field[] = [];
  let offset = 0;

  const readVarint = () => {
    let value = 0;
    let multiplier = 1;
    while (offset < buffer.length) {
      const byte = buffer[offset++];
      value += (byte & 0x7f) * multiplier;
      multiplier *= 0x80;
      if ((byte & 0x80) === 0) {
        break;
      }
    }
    return value;
  };

  while (offset < buffer.length) {
    const tag = readVarint();
    const number = Math.floor(tag / 8);
    const wireType = tag % 8;

    if (wireType === 0) {
      fields.push({ number, value: readVarint() });
    } else if (wireType === 1) {
      offset += 8;
    } else if (wireType === 2) {
      const length = readVarint();
      fields.push({ number, value: buffer.subarray(offset, offset + length) });
      offset += length;
    } else if (wireType === 5) {
      offset += 4;
    } else {
      break;
    }
  }

  return fields;
}
