import { randomUUID } from "node:crypto";

import Ajv, { ErrorObject, ValidateFunction } from "ajv";

import {
  BootNotificationConf,
  CallErrorMessage, 
  CallMessage, 
  CallResultMessage, 
  OcppErrorCode, 
  OcppMessageAction, 
  OcppMessageType, 
  ValidateOcppPayloadResult
} from "./ocpp.types";
import { 
  BootNotificationConfSchema 
} from "./schemas";

const ajv = new Ajv();

const ocppValidators: Record<string, ValidateFunction<unknown>> = {
  [OcppMessageAction.BOOT_NOTIFICATION]: ajv.compile<BootNotificationConf>(BootNotificationConfSchema)
};

export class OcppService {
  public callMessage<P>(action: OcppMessageAction, payload: P): CallMessage<P> {
    return [OcppMessageType.CALL, randomUUID(), action, payload];
  }

  public callResultMessage<P>(messageId: string, payload: P): CallResultMessage<P> {
    return [OcppMessageType.RESULT, messageId, payload];
  }

  public callErrorMessage(messageId: string, errorCode: OcppErrorCode, description: string = "", details: Record<string, unknown> = {}): CallErrorMessage {
    return [OcppMessageType.ERROR, messageId, errorCode, description, JSON.stringify(details)];
  }

  public validateOcppPayload<P>(action: OcppMessageAction, payload: P): ValidateOcppPayloadResult {
    const validator = ocppValidators[action];

    if (!validator) {
      return { isValid: false, errors: [{ keyword: "NotImplemented" } as ErrorObject] };
    }
  
    const isValid = validator(payload);
  
    return {
      isValid,
      errors: isValid ? null : validator.errors
    };
  }
}
