const emptyServerOnlyModule = "data:text/javascript,export%20{}";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { shortCircuit: true, url: emptyServerOnlyModule };
  }

  return nextResolve(specifier, context);
}
