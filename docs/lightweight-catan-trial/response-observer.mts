// Same one-read Proxy mechanism used in the original trial, extracted for an offline body-consumption regression.
export function observeResponse(response: Response, onJSON: (payload: unknown) => void): Response {
  return new Proxy(response, {get(target, property) {
    if (property==='json') return async()=>{const payload=await target.json();onJSON(payload);return payload;};
    const value=Reflect.get(target,property,target);
    return typeof value==='function'?value.bind(target):value;
  }});
}
