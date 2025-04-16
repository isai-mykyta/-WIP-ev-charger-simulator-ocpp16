import { IsDateString, IsEnum, IsInt, IsNotEmpty } from "class-validator";

import { RegistrationStatus } from "../ocpp.types";

export class BootNotificationConfSchema {
  @IsNotEmpty()
  @IsDateString()
  public currentTime: string;

  @IsNotEmpty()
  @IsInt()
  public interval: number;

  @IsNotEmpty()
  @IsEnum(RegistrationStatus)
  public status: RegistrationStatus;
}
