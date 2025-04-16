import { randomUUID } from "node:crypto";

import {
  CallErrorMessage, 
  CallMessage, 
  CallResultMessage, 
  OcppErrorCode, 
  OcppMessage, 
  OcppMessageAction, 
  OcppMessageType,
} from "./ocpp.types";
import { BootNotificationConfSchema } from "./schemas";
import { validateDto } from "../utils";

export class OcppService {
  private readonly ocppResponsesValidators = {
    [OcppMessageAction.BOOT_NOTIFICATION]: BootNotificationConfSchema
  };

  private readonly ocppRequestsValidators = {};

  private mapErrorConstraintToErrorCode(constraint: string): OcppErrorCode {
    switch (constraint) {
    case "isEmail":
    case "isUUID":
    case "isDateString":
    case "isUrl":
    case "whitelistValidation":
    case "maxLength":
    case "minLength":
    case "length":
    case "isEnum":
      return OcppErrorCode.FORMATION_VIOLATION;

    case "isInt":
    case "isBoolean":
    case "isString":
    case "isNumber":
      return OcppErrorCode.TYPE_CONSTRAINT_VIOLATION;

    case "isNotEmpty":
      return OcppErrorCode.PROTOCOL_ERROR;
        
    case "customValidation":
      return OcppErrorCode.NOT_IMPLEMENTED;
        
    default:
      return OcppErrorCode.GENERIC_ERROR;
    }
  }

  public callMessage<P>(action: OcppMessageAction, payload: P): CallMessage<P> {
    return [OcppMessageType.CALL, randomUUID(), action, payload];
  }

  public callResultMessage<P>(messageId: string, payload: P): CallResultMessage<P> {
    return [OcppMessageType.RESULT, messageId, payload];
  }

  public callErrorMessage(messageId: string, errorCode: OcppErrorCode, description: string = "", details: Record<string, unknown> = {}): CallErrorMessage {
    return [OcppMessageType.ERROR, messageId, errorCode, description, JSON.stringify(details)];
  }

  public validateOcppCallMessage(message: OcppMessage<unknown>): boolean {
    return message?.[0] === OcppMessageType.CALL && message.length === 4;
  }

  public validateOcppResultMessage(message: OcppMessage<unknown>): boolean {
    return message?.[0] === OcppMessageType.RESULT && message.length === 3;
  }

  public validateOcppErrorMessage(message: OcppMessage<unknown>): boolean {
    return message?.[0] === OcppMessageType.ERROR && message.length === 5;
  }

  public validateOcppResultPayload<P>(action: OcppMessageAction, payload: P): boolean {
    if (!this.ocppResponsesValidators[action]) return false;
    const validationResult = validateDto(payload, this.ocppResponsesValidators[action]);
    return validationResult.isValid;
  }

  public validateOcppRequestPayload<P>(action: OcppMessageAction, messageId: string, payload: P): { isValid: boolean, errorCode?: OcppErrorCode } {
    if (!this.ocppRequestsValidators[action]) {
      return { isValid: false, errorCode: OcppErrorCode.NOT_IMPLEMENTED };
    }

    const { isValid, errors } = validateDto(payload, this.ocppRequestsValidators[action]);

    if (!isValid) {
      const [firstError] = errors;
      return  { isValid: false, errorCode: this.mapErrorConstraintToErrorCode(firstError.constraint) };
    }

    return { isValid: true };
  } 
}
