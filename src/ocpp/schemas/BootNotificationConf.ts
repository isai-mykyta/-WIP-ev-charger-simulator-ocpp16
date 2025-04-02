import { RegistrationStatus } from "../ocpp.types";

export const BootNotificationConfSchema = {
  type: "object",
  properties: {
    currentTime: {
      type: "string",
      format: "date-time"
    },
    interval: {
      type: "number"
    },
    status: {
      type: "string",
      enum: [Object.values(RegistrationStatus)]
    }
  },
  additionalProperties: false,
  required: ["status", "interval", "currentTime"]
};
