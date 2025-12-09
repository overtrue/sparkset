// Utility helpers placeholder.
export const noop = () => undefined;

export const isReadonlySQL = (sql: string): boolean => {
  // naive check for harmful keywords; replace with AST-based validator later.
  const forbidden = /(insert|update|delete|drop|alter|truncate)/i;
  return !forbidden.test(sql);
};
