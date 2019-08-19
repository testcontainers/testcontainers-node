declare module "default-gateway" {
  namespace v4 {
    interface GatewayResponse {
      gateway: string;
    }

    function sync(): GatewayResponse;
  }
}
