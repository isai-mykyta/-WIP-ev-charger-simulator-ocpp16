import { WebSocketServer } from "ws";

import { WebSocketService } from "../../websocket";

process.env.CS_CPMS_URL = "ws://127.0.0.1:8080/ocpp1.6";
process.env.CS_IDENTITY = "TEST.CHARGING.SIMULATOR";
process.env.CS_WEB_SOCKET_PING_INTERVAL = "60";
process.env.CS_MODEL = "HYC300";
process.env.CS_VENDOR = "alpitronic";
process.env.CS_CHARGEBOX_SERIAL_NUMBER = "100101";
process.env.CS_SERIAL_NUMBER = "100101";
process.env.CS_FIRMWARE_VERSION = "1.0.0";
process.env.CS_ICCID = "1";
process.env.CS_IMSI = "1";
process.env.CS_METER_SERIAL_NUMBER = "test-serial";
process.env.CS_METER_TYPE = "test-meter";

describe("WebSocket service", () => {
  let websocketClient: WebSocketService;
  let websocketServer: WebSocketServer;

  beforeEach((done) => {
    jest.clearAllMocks();

    websocketClient = new WebSocketService();
    websocketServer = new WebSocketServer({ port: 8080 });
    websocketServer.on("listening", done);
  });

  afterEach((done) => {
    websocketServer.close(done);
    websocketClient.disconnect();
  });

  test("Should connect to WS server", (done) => {
    websocketServer.once("connection", async (ws, req) => {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));

      expect(req.url).toBe(`/ocpp1.6/${websocketClient.chargePointIdentity}`);
      expect(ws.protocol).toBe("ocpp1.6");
      expect(websocketClient.isConnected).toBe(true);
      expect(websocketServer.clients.has(ws)).toBe(true);
      done();
    });

    websocketClient.connect();
  });

  test("Should disconnect from WS server", (done) => {
    websocketServer.once("connection", async (ws, req) => {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));

      ws.once("close", async () => {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));
        expect(websocketServer.clients.has(ws)).toBe(false);
        expect(websocketClient.isConnected).toBe(false);
        done();
      });
      
      websocketClient.disconnect();
    });

    websocketClient.connect();
  });
});
