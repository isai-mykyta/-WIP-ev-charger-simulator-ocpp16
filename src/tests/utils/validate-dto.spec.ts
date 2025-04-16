import { IsInt, IsNotEmpty, IsString } from "class-validator";

import { validateDto } from "../../utils";

class DtoExample {
  @IsNotEmpty()
  @IsString()
  public foo: string;

  @IsNotEmpty()
  @IsInt()
  public intProp: number;
}

describe("Validate DTO util", () => {
  test("Should pass validation with valid DTO", () => {
    const validInput = { foo: "bar", intProp: 1 };
    const result = validateDto(validInput, DtoExample);

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test("Should reject validation with invalid DTO", () => {
    const invalidInput = { invalidProp: "bar" };
    const result = validateDto(invalidInput, DtoExample);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
