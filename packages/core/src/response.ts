export type ResponseLike = {
  header?(name: string, value: string): unknown;
  setHeader?(
    name: string,
    value: string | number | readonly string[]
  ): unknown;
};

export function setResponseHeader(
  response: ResponseLike,
  name: string,
  value: string
): void {
  if (typeof response.header === "function") {
    response.header(name, value);
    return;
  }

  if (typeof response.setHeader === "function") {
    response.setHeader(name, value);
  }
}
