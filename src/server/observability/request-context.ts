import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  method: string;
  pathname: string;
  requestId: string;
  route: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => Promise<T> | T,
) {
  return storage.run(context, callback);
}

export function getRequestContext() {
  return storage.getStore();
}
