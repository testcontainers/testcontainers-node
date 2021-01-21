export type CredentialProviderResponse = {
  ServerURL: string;
  Username: string;
  Secret: string;
};

export type Auth = {
  auth?: string;
  email?: string;
  username?: string;
  password?: string;
};

export type DockerConfig = {
  credHelpers?: { [registry: string]: string };
  credsStore?: string;
  auths?: { [registry: string]: Auth }[];
};
