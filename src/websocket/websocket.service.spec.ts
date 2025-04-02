import { WebSocketServer } from "ws";

import { WebSocketService } from "./websocket.service";
import { OcppMessageAction, OcppMessageType } from "../ocpp";

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

describe("WebsocketService", () => {
  let websocketClient: WebSocketService;
  let websocketServer: WebSocketServer;

  beforeAll((done) => {
    websocketServer = new WebSocketServer({ port: 8080 });
    websocketServer.on("listening", done);
  });

  afterAll((done) => {
    websocketServer.close(done);
  });

  afterEach((done) => {
    websocketClient?.disconnect();
    setTimeout(done, 1000);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Should connect to WS server", (done) => {
    websocketServer.once("connection", (ws, req) => {
      expect(req.url).toBe(`/ocpp1.6/${websocketClient.chargePointIdentity}`);
      expect(ws.protocol).toBe("ocpp1.6");
      expect(websocketServer.clients.has(ws)).toBe(true);
      done();
    });

    websocketClient = new WebSocketService();
    websocketClient.connect();
  });

  test("Should send BootNotificationReq on connect", (done) => {
    websocketServer.once("connection", (ws) => {
      ws.once("message", (msg) => {
        const [type,, action, payload] = JSON.parse(msg.toString());
        expect(type).toBe(OcppMessageType.CALL);
        expect(action).toBe(OcppMessageAction.BOOT_NOTIFICATION);
        expect(payload.chargePointModel).toBe(process.env.CS_MODEL);
        expect(payload.chargePointVendor).toBe(process.env.CS_VENDOR);
        done();
      });
    });
  
    websocketClient = new WebSocketService();
    websocketClient.connect();
  });
});
