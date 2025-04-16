import { randomUUID } from "node:crypto";

import { OcppErrorCode, OcppMessage, OcppMessageAction, OcppMessageType, OcppService } from "../../ocpp";

describe("OCPP service", () => {
  let ocppService: OcppService;

  beforeEach(() => {
    ocppService = new OcppService();
  });

  test("Should construct OCPP call message", () => {
    const callMessage = ocppService.callMessage(OcppMessageAction.RESET, { type: "Soft" });
    const [type, id, action, payload] = callMessage;

    expect(callMessage.length).toBe(4);
    expect(type).toBe(OcppMessageType.CALL);
    expect(typeof id).toBe("string");
    expect(action).toBe(OcppMessageAction.RESET);
    expect(payload).toStrictEqual({ type: "Soft" });
  });

  test("Should construct OCPP call result message", () => {
    const messageId = randomUUID();
    const callResultMessage = ocppService.callResultMessage(messageId, { status: "Accepted" });
    const [type, id, payload] = callResultMessage;

    expect(callResultMessage.length).toBe(3);
    expect(type).toBe(OcppMessageType.RESULT);
    expect(id).toBe(messageId);
    expect(payload).toStrictEqual({ status: "Accepted" });
  });

  test("Should construct OCPP call error message", () => {
    const messageId = randomUUID();
    const callErrorMessage = ocppService.callErrorMessage(messageId, OcppErrorCode.FORMATION_VIOLATION);
    const [type, id, errorCode, description, details] = callErrorMessage;

    expect(callErrorMessage.length).toBe(5);
    expect(type).toBe(OcppMessageType.ERROR);
    expect(id).toBe(messageId);
    expect(errorCode).toBe(OcppErrorCode.FORMATION_VIOLATION);
    expect(description).toBe("");
    expect(details).toBe("{}");
  });

  test("Should validate OCPP call message", () => {
    const validMessage = ocppService.callMessage(OcppMessageAction.RESET, { type: "Soft" });
    const invalidMessage = [OcppMessageType.RESULT, randomUUID(), OcppMessageAction.RESET, { type: "Soft" }] as unknown as OcppMessage<unknown>;

    expect(ocppService.validateOcppCallMessage(validMessage)).toBe(true);
    expect(ocppService.validateOcppCallMessage(invalidMessage)).toBe(false);
  });

  test("Should validate OCPP result message", () => {
    const validMessage = ocppService.callResultMessage(randomUUID(), { type: "Soft" });
    const invalidMessage = [OcppMessageType.RESULT, randomUUID(), OcppMessageAction.RESET, { type: "Soft" }] as unknown as OcppMessage<unknown>;

    expect(ocppService.validateOcppResultMessage(validMessage)).toBe(true);
    expect(ocppService.validateOcppResultMessage(invalidMessage)).toBe(false);
  });

  test("Should validate OCPP error message", () => {
    const validMessage = ocppService.callErrorMessage(randomUUID(), OcppErrorCode.GENERIC_ERROR);
    const invalidMessage = [OcppMessageType.RESULT, randomUUID(), OcppMessageAction.RESET, { type: "Soft" }] as unknown as OcppMessage<unknown>;

    expect(ocppService.validateOcppErrorMessage(validMessage)).toBe(true);
    expect(ocppService.validateOcppErrorMessage(invalidMessage)).toBe(false);
  });

  test("Should validate OCPP message", () => {
    const validMessage = ocppService.callErrorMessage(randomUUID(), OcppErrorCode.GENERIC_ERROR);
    const invalidMessage = [OcppMessageType.RESULT, randomUUID(), OcppMessageAction.RESET, { type: "Soft" }] as unknown as OcppMessage<unknown>;

    expect(ocppService.validateOcppErrorMessage(validMessage)).toBe(true);
    expect(ocppService.validateOcppErrorMessage(invalidMessage)).toBe(false);
  });
});
