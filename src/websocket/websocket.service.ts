import { randomUUID } from "node:crypto";

import WebSocket from "ws";

import { 
  BootNotificationConf,
  CallErrorMessage,
  CallMessage, 
  CallResultMessage, 
  OcppErrorCode, 
  OcppMessage, 
  OcppMessageAction, 
  OcppMessageType, 
  OcppService, 
  RegistrationStatus
} from "../ocpp";

export class WebSocketService {
  public readonly chargePointIdentity = process.env.CS_IDENTITY;
  public readonly cpmsUrl = process.env.CS_CPMS_URL;
  public readonly wsPingInterval = Number(process.env.CS_WEB_SOCKET_PING_INTERVAL) || 60;

  public registrationStatus: RegistrationStatus;
  public heartbeatInterval = Number(process.env.CS_HEARTBEAT_INTERVAL) || 60;

  private readonly ocppService = new OcppService();

  private wsClient: WebSocket;
  private pingTimeout: NodeJS.Timeout;
  private pendingMessages = new Map<string, CallMessage<unknown>>();

  private startPingInterval(): void {
    this.pingTimeout = setInterval(() => {
      this.wsClient.ping();
    }, this.wsPingInterval * 1000);
  }

  public connect(): void {
    this.wsClient = new WebSocket(`${this.cpmsUrl}/${this.chargePointIdentity}`, "ocpp1.6");

    this.wsClient.on("open", this.onOpen.bind(this));
    this.wsClient.on("ping", this.onPing.bind(this));
    this.wsClient.on("pong", this.onPong.bind(this));
    this.wsClient.on("close", this.onClose.bind(this));
    this.wsClient.on("error", this.onError.bind(this));
    this.wsClient.on("message", this.onMessage.bind(this));
    
    this.startPingInterval();
  }

  private cleanup(): void {
    if (this.pingTimeout) {
      clearInterval(this.pingTimeout);
    }
  }

  public disconnect(): void {
    this.wsClient.close();
    this.cleanup();
  }

  private onPong() {};
  private onError() {};

  private onMessage(msg: WebSocket.RawData): void {
    let parsedMessage: OcppMessage<unknown>;

    if (this.registrationStatus === RegistrationStatus.REJECTED) {
      console.error("While Rejected, the Charge Point SHALL NOT respond to any Central System initiated message");
      return;
    }
    
    try {
      parsedMessage = JSON.parse(msg.toString());
    } catch {
      console.error("Failed to parse incoming OCPP message", msg);
      return;
    }

    if (!Array.isArray(parsedMessage)) {
      console.error("Invalid OCPP message received", parsedMessage);
      return;
    }

    const [messageType] = parsedMessage;

    if (![2, 3, 5].includes(messageType)) {
      console.error("Invalid OCPP message type received", messageType);
      return;
    }

    const isInvalidCallMessage = messageType === OcppMessageType.CALL && parsedMessage.length !== 4;
    const isInvalidResultMessage = messageType === OcppMessageType.RESULT && parsedMessage.length !== 3;
    const isInvalidErrorMessage = messageType === OcppMessageType.ERROR && parsedMessage.length !== 5;

    if (isInvalidCallMessage) {
      console.error("Invalid OCPP call message received", parsedMessage);
      const errorMessage = this.ocppService.callErrorMessage(randomUUID(), OcppErrorCode.FORMATION_VIOLATION, "Invalid OCPP call message received");
      this.send(JSON.stringify(errorMessage));
      return;
    }

    if (isInvalidResultMessage || isInvalidErrorMessage) {
      console.error("Invalid OCPP message received", parsedMessage);
      return;
    }

    switch (messageType) {
    case OcppMessageType.CALL:
      this.handleCallMessage(parsedMessage);
      break;
    case OcppMessageType.RESULT:
      this.handleCallResultMessage(parsedMessage);
      break;
    case OcppMessageType.ERROR:
      this.handleCallErrorMessage(parsedMessage);
      break;
    default:
      break;
    }
  };

  private handleCallMessage(message: CallMessage<unknown>): void {
    const [, messageId, action, payload] = message;
    const isTransactionRequest = [OcppMessageAction.REMOTE_STOP_TRANSACTION, OcppMessageAction.REMOTE_START_TRANSACTION].includes(action);
    
    if (isTransactionRequest && this.registrationStatus === RegistrationStatus.REJECTED) {
      console.error("Can not proceed transaction request while CS being rejected by Central System");
      return;
    }

    const { isValid, errors } = this.ocppService.validateOcppPayload(action, payload);

    if (!isValid) {
      const [firstError] = errors;
      let errorMessage: CallErrorMessage;

      switch (firstError.keyword) {
      case "additionalProperties":
      case "enum":
      case "format":
      case "maxLength":
        errorMessage = this.ocppService.callErrorMessage(messageId, OcppErrorCode.FORMATION_VIOLATION);
        break;
      case "type":
        errorMessage = this.ocppService.callErrorMessage(messageId, OcppErrorCode.TYPE_CONSTRAINT_VIOLATION);
        break;
      case "required":
        errorMessage = this.ocppService.callErrorMessage(messageId, OcppErrorCode.PROTOCOL_ERROR);
        break;
      case "NotImplemented":
        errorMessage = this.ocppService.callErrorMessage(messageId, OcppErrorCode.NOT_IMPLEMENTED);
        break;
      default:
        errorMessage = this.ocppService.callErrorMessage(messageId, OcppErrorCode.GENERIC_ERROR);
        break;
      }

      console.error("Error during validation of OCPP call message", errorMessage);
      this.send(JSON.stringify(errorMessage));
      return;
    }
  }

  private handleCallResultMessage(message: CallResultMessage<unknown>): void {
    const [, messageId, payload] = message;
    const pendingRequest = this.pendingMessages.get(messageId);

    if (!pendingRequest) {
      console.error("Failed to find pending request for received message", message);
      return;
    }

    const [,, action] = pendingRequest;
    const { isValid, errors } = this.ocppService.validateOcppPayload(action, payload);

    if (!isValid) {
      console.error("Recieved invlid OCPP result message", errors);
      this.cleanPendingRequest(messageId);
      return;
    }

    switch (action) {
    case OcppMessageAction.BOOT_NOTIFICATION:
      this.handleBootNotification(payload as BootNotificationConf);
      break;
    default:
      break;
    }
  }

  private handleBootNotification(payload: BootNotificationConf): void {
    this.registrationStatus = payload.status;
    if (payload.interval > 10) this.heartbeatInterval = payload.interval;
  }

  private handleCallErrorMessage(message: CallErrorMessage): void {}

  private onOpen(): void {
    console.log("WebSocket connection is opened");

    const bootNotificationReq = this.ocppService.callMessage(OcppMessageAction.BOOT_NOTIFICATION, {
      chargePointModel: process.env.CS_MODEL,
      chargePointVendor: process.env.CS_VENDOR,
      ...(process.env.CS_IMSI && { imsi: process.env.CS_IMSI }),
      ...(process.env.CS_ICCID && { iccid: process.env.CS_ICCID }),
      ...(process.env.CS_METER_TYPE && { meterType: process.env.CS_METER_TYPE }),
      ...(process.env.CS_FIRMWARE_VERSION && { firmwareVersion: process.env.CS_FIRMWARE_VERSION }),
      ...(process.env.CS_SERIAL_NUMBER && { chargePointSerialNumber: process.env.CS_SERIAL_NUMBER }),
      ...(process.env.CS_METER_SERIAL_NUMBER && { meterSerialNumber: process.env.CS_METER_SERIAL_NUMBER }),
      ...(process.env.CS_CHARGEBOX_SERIAL_NUMBER && { chargeBoxSerialNumber: process.env.CS_CHARGEBOX_SERIAL_NUMBER }),
    });

    this.sendRequest(bootNotificationReq);
  };

  private sendRequest(message: CallMessage<unknown>): void {
    this.send(JSON.stringify(message));
    this.storePendingRequest(message);
  }

  private storePendingRequest(message: CallMessage<unknown>): void {
    const [, messageId] = message;
    this.pendingMessages.set(messageId, message);
  }

  private cleanPendingRequest(messageId: string): void {
    this.pendingMessages.delete(messageId);
  }

  private send(message: string): void {
    this.wsClient.send(message);
  }

  private onClose(): void {
    console.log("WebSocket connection is closed");
    this.cleanup();
  };

  private onPing(): void {
    this.wsClient.pong();
  };
}
