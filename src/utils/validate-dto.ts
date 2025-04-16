import { ClassConstructor, plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

export type ConstraintError = {
  property: string;
  constraint: string;
  message: string;
};

export type ValidateDtoResult = {
  isValid: boolean;
  errors: ConstraintError[];
}

export const validateDto = <I, D extends ClassConstructor<any>>(input: I, dto: D): ValidateDtoResult => {
  const instance = plainToInstance(dto, input);
  const validationErrors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });

  const errors = validationErrors.flatMap(
    (err) => Object.entries(err.constraints ?? {}).map(([constraint, message]) => ({
      property: err.property,
      constraint,
      message,
    }))
  );

  return {
    isValid: errors.length === 0,
    errors
  };
};
