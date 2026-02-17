import type { TokenCredential } from "@azure/core-auth";
import { BlobServiceClient } from "@azure/storage-blob";

// azuriteTestUtils {
type BlobClientPipelineOptions = NonNullable<Parameters<typeof BlobServiceClient.fromConnectionString>[1]>;
type BlobClientPipelineOptionsWithTls = BlobClientPipelineOptions & { tlsOptions: { ca: string } };

const base64UrlEncode = (value: string): string => Buffer.from(value).toString("base64url");

const createJwtToken = (payload: Record<string, string | number>): string => {
  const header = { alg: "none", typ: "JWT" };
  return `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}.`;
};

export const getTlsPipelineOptions = (ca: string): BlobClientPipelineOptionsWithTls => ({
  tlsOptions: {
    ca,
  },
});

export const createOAuthToken = (audience: string): string => {
  const now = Math.floor(Date.now() / 1000);

  return createJwtToken({
    nbf: now - 60,
    iat: now - 60,
    exp: now + 3600,
    iss: "https://sts.windows.net/ab1f708d-50f6-404c-a006-d71b2ac7a606/",
    aud: audience,
    scp: "user_impersonation",
    oid: "23657296-5cd5-45b0-a809-d972a7f4dfe1",
    tid: "dd0d0df1-06c3-436c-8034-4b9a153097ce",
  });
};

export const createTokenCredential = (token: string): TokenCredential => ({
  getToken: async (_scopes: string | string[]) => ({
    token,
    expiresOnTimestamp: Date.now() + 3600_000,
  }),
});
// }
