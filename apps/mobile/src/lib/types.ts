import type { components } from "@/lib/schema";

type Schemas = components["schemas"];

export type Item = Schemas["ItemRead"];
export type Transaction = Schemas["TransactionRead"];
export type TransactionPage = Schemas["TransactionPage"];
export type ItemInput = Schemas["ItemIn"];
export type TransactionInput = Omit<Schemas["TransactionCreate"], "source">;
export type TokenPair = Schemas["TokenPair"];
