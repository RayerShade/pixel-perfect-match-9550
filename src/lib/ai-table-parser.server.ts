/** Server-only AI parser fallback. */
export const AI_TABLE_PARSER_CONFIGURED = () => Boolean(process.env.AI_TABLE_PARSER_API_KEY);
export const AI_TABLE_PARSER_ENV = ["AI_TABLE_PARSER_API_KEY", "AI_TABLE_PARSER_MODEL", "AI_TABLE_PARSER_API_URL"] as const;
