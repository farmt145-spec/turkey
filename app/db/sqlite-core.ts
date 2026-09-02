import {
  sqliteTable,
  text as sqliteText,
  integer,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export { sqliteTable, index, uniqueIndex };

export function sqliteEnum<const T extends readonly [string, ...string[]]>(
  name: string,
  values: T,
) {
  return sqliteText(name, { enum: values });
}

export function serial(name: string) {
  return integer(name, { mode: "number" }).primaryKey({ autoIncrement: true });
}

export function varchar(name: string, _config?: { length?: number }) {
  return sqliteText(name);
}

export function text(name: string) {
  return sqliteText(name);
}

export function timestamp(name: string, _config?: unknown) {
  return integer(name, { mode: "timestamp" });
}

export function bigint(name: string, _config?: { mode?: "number"; unsigned?: boolean }) {
  return integer(name, { mode: "number" });
}

export function int(name: string, _config?: { mode?: "number"; unsigned?: boolean }) {
  return integer(name, { mode: "number" });
}

export function decimal(
  name: string,
  _config?: { precision?: number; scale?: number },
) {
  return numeric(name, { mode: "string" });
}

export function boolean(name: string) {
  return integer(name, { mode: "boolean" });
}

export function date(name: string, _config?: { mode?: "string" }) {
  return sqliteText(name);
}

export function json(name: string) {
  return sqliteText(name, { mode: "json" });
}
