export const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

export const isEmptyString = (value: string): value is string => value.trim() === "";

export const isNotEmptyString = (value: string): value is string => !isEmptyString(value);
