(function installPreviewHostBridge() {
  const CHANNEL = "grok-preview-bridge";
  const VERSION = 1;
  const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";

  if (typeof window === "undefined" || window.parent === window) return;

  const ancestorOrigin =
    typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0
      ? location.ancestorOrigins[0]
      : null;
  const referrerOrigin = (() => {
    try {
      return document.referrer ? new URL(document.referrer).origin : null;
    } catch {
      return null;
    }
  })();
  const parentOrigin = ancestorOrigin || referrerOrigin;
  if (!parentOrigin) return;

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  const isSafePath = (path) => {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
    try {
      return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
    } catch {
      return false;
    }
  };

  const post = (message) => {
    window.parent.postMessage(message, parentOrigin);
  };

  const reportLocation = () => {
    post({
      channel: CHANNEL,
      version: VERSION,
      type: "location",
      path: window.location.pathname || "/",
      search: window.location.search,
      hash: window.location.hash,
    });
  };

  const reportRoutes = () => {
    post({
      channel: CHANNEL,
      version: VERSION,
      type: "routes",
      paths: ["/", "/catalog", "/docs", "/studio", "/product/:id"],
    });
  };

  const announce = () => {
    reportLocation();
    reportRoutes();
    post({ channel: CHANNEL, version: VERSION, type: "ready" });
  };

  try {
    const current = window.history.state;
    const alreadyTagged =
      current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY);
    if (!alreadyTagged) {
      const isRoot = window.history.length <= 1;
      const marked =
        current && typeof current === "object" ? { ...current, [ROOT_STATE_KEY]: isRoot } : { [ROOT_STATE_KEY]: isRoot };
      originalReplaceState(marked, "", window.location.href);
    }
  } catch {
    // ignore
  }

  window.history.pushState = (data, unused, url) => {
    const next = data && typeof data === "object" ? { ...data, [ROOT_STATE_KEY]: false } : data;
    originalPushState(next, unused, url);
    reportLocation();
  };
  window.history.replaceState = (data, unused, url) => {
    originalReplaceState(data, unused, url);
    reportLocation();
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.origin !== parentOrigin) return;
    const data = event.data;
    if (!data || data.channel !== CHANNEL || data.version !== VERSION) return;
    if (data.type === "hello") {
      announce();
      return;
    }
    if (data.type === "navigate" && typeof data.path === "string" && isSafePath(data.path)) {
      const url = new URL(data.path, window.location.origin);
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.pushState(window.history.state, "", next);
      window.dispatchEvent(new PopStateEvent("popstate"));
      queueMicrotask(reportLocation);
      return;
    }
    if (data.type === "history" && (data.delta === -1 || data.delta === 1)) {
      const state = window.history.state;
      const atRoot = Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
      if (data.delta === -1 && atRoot) return;
      window.history.go(data.delta);
    }
  });

  window.addEventListener("popstate", reportLocation);
  window.addEventListener("hashchange", reportLocation);
  announce();
})();
