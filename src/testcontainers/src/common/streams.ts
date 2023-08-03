import { Readable } from "stream";

type Options = { trim: boolean };

export const streamToString = async (stream: Readable, options: Options = { trim: false }): Promise<string> => {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  const str = Buffer.concat(chunks).toString("utf-8");

  return options.trim ? str.trim() : str;
};
