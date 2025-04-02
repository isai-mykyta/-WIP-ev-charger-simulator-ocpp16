import { WebSocketServer } from "ws";

import { WebSocketService } from "./websocket.service";
import { OcppMessageAction, OcppMessageType, RegistrationStatus } from "../ocpp";

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

const bootNotificationResponse = {
  currentTime: new Date().toISOString(),
  interval: 180,
  status: RegistrationStatus.ACCEPTED
};

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
    websocketClient = new WebSocketService();
  });

  test("Should connect to WS server", (done) => {
    websocketServer.once("connection", async (ws, req) => {
      expect(req.url).toBe(`/ocpp1.6/${websocketClient.chargePointIdentity}`);
      expect(ws.protocol).toBe("ocpp1.6");
      expect(websocketServer.clients.has(ws)).toBe(true);
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));
      done();
    });

    websocketClient.connect();
  });

  test("Should send BootNotificationReq and process BootNotificationCong", (done) => {
    websocketServer.once("connection", async (ws) => {
      ws.once("message", async (msg) => {
        const ocppMessage = JSON.parse(msg.toString());
        expect(Array.isArray(ocppMessage)).toBe(true);
        const [requestType, messageId, action, requestPayload] = ocppMessage;

        expect(requestType).toBe(OcppMessageType.CALL);
        expect(action).toBe(OcppMessageAction.BOOT_NOTIFICATION);
        expect(requestPayload.chargePointModel).toBe(process.env.CS_MODEL);
        expect(requestPayload.chargePointVendor).toBe(process.env.CS_VENDOR);

        await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));

        const response = [OcppMessageType.RESULT, messageId, bootNotificationResponse];
        ws.send(JSON.stringify(response));

        await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));

        expect(websocketClient.registrationStatus).toBe(RegistrationStatus.ACCEPTED);
        expect(websocketClient.heartbeatInterval).toBe(180);
        done();
      });
    });

    websocketClient.connect();
  });

  test("Should use default heartbeat interval if BootNotificationConf interval is too small", (done) => {
    websocketServer.once("connection", async (ws) => {
      ws.once("message", async (msg) => {
        const ocppMessage = JSON.parse(msg.toString());
        const [, messageId,] = ocppMessage;

        await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));

        bootNotificationResponse.interval = 10;
        const response = [OcppMessageType.RESULT, messageId, bootNotificationResponse];
        ws.send(JSON.stringify(response));

        await new Promise<void>((resolve) => setTimeout(() => resolve(), 500));

        expect(websocketClient.registrationStatus).toBe(RegistrationStatus.ACCEPTED);
        expect(websocketClient.heartbeatInterval).toBe(60);
        done();
      });
    });

    websocketClient.connect();
  });
});
