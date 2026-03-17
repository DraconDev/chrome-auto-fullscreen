var background = (function() {
  "use strict";
  var _a, _b;
  const browser = (
    // @ts-expect-error
    ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) == null ? globalThis.chrome : (
      // @ts-expect-error
      globalThis.browser
    )
  );
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }
  const definition = defineBackground({
    main() {
      let ctrlHeld = false;
      let ctrlResetTimeout = null;
      const debuggerAttached = /* @__PURE__ */ new Set();
      chrome.tabs.onRemoved.addListener((tabId) => {
        debuggerAttached.delete(tabId);
      });
      const savedBounds = /* @__PURE__ */ new Map();
      const saveBounds = (win) => {
        if (win.id === void 0) return;
        if (win.top !== void 0 && win.left !== void 0 && win.width !== void 0 && win.height !== void 0) {
          savedBounds.set(win.id, { top: win.top, left: win.left, width: win.width, height: win.height });
          console.log("[AF BG] saved bounds for win", win.id, win.left, win.top, win.width, win.height);
        }
      };
      const restoreBounds = (winId) => {
        const b = savedBounds.get(winId);
        if (b) {
          savedBounds.delete(winId);
          console.log("[AF BG] restoring bounds for win", winId, b);
          chrome.windows.update(winId, { state: "normal", top: b.top, left: b.left, width: b.width, height: b.height });
        } else {
          console.log("[AF BG] no saved bounds for win", winId);
          chrome.windows.update(winId, { state: "normal" });
        }
      };
      chrome.action.onClicked.addListener(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL("/settings.html") });
      });
      browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        var _a2;
        if (message.action === "setModifiers") {
          ctrlHeld = message.ctrl || message.meta || false;
          return false;
        }
        if (message.action === "getModifierState") {
          sendResponse({ ctrlHeld });
          if (ctrlResetTimeout) clearTimeout(ctrlResetTimeout);
          ctrlResetTimeout = setTimeout(() => {
            ctrlHeld = false;
          }, 1e4);
          return true;
        }
        if (message.action === "sendFKey") {
          const tabId = (_a2 = sender.tab) == null ? void 0 : _a2.id;
          if (!tabId) return false;
          console.log("[AF BG] sendFKey for tab", tabId);
          const sendKey = () => {
            console.log("[AF BG] sending F key to tab", tabId);
            chrome.debugger.sendCommand(
              { tabId },
              "Input.dispatchKeyEvent",
              { type: "keyDown", key: "f", code: "KeyF", windowsVirtualKeyCode: 70, nativeVirtualKeyCode: 70 },
              () => {
                chrome.debugger.sendCommand(
                  { tabId },
                  "Input.dispatchKeyEvent",
                  { type: "keyUp", key: "f", code: "KeyF", windowsVirtualKeyCode: 70, nativeVirtualKeyCode: 70 }
                );
              }
            );
          };
          if (debuggerAttached.has(tabId)) {
            sendKey();
          } else {
            console.log("[AF BG] attaching debugger to tab", tabId, "- watch for Chrome notification!");
            chrome.debugger.attach({ tabId }, "1.3", () => {
              if (chrome.runtime.lastError) {
                console.log("[AF BG] debugger attach FAILED:", chrome.runtime.lastError.message);
                return;
              }
              console.log("[AF BG] debugger attached OK");
              debuggerAttached.add(tabId);
              sendKey();
            });
          }
          return false;
        }
        if (message.action === "toggleWindowFullscreen") {
          chrome.windows.getCurrent((win) => {
            if (win.id === void 0) return;
            if (win.state === "fullscreen") {
              restoreBounds(win.id);
            } else {
              saveBounds(win);
              chrome.windows.update(win.id, { state: "fullscreen" });
            }
          });
          return false;
        }
        if (message.action === "setWindowFullscreen") {
          chrome.windows.getCurrent((win) => {
            if (win.id === void 0 || win.state === "fullscreen") return;
            saveBounds(win);
            console.log("[AF BG] entering fullscreen for win", win.id);
            chrome.windows.update(win.id, { state: "fullscreen" });
          });
          return false;
        }
        if (message.action === "exitWindowFullscreen") {
          chrome.windows.getCurrent((win) => {
            if (win.id === void 0 || win.state !== "fullscreen") return;
            console.log("[AF BG] exiting fullscreen for win", win.id);
            restoreBounds(win.id);
          });
          return false;
        }
        return false;
      });
    }
  });
  background;
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = `${"ws:"}//${"localhost"}:${3e3}`;
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws == null ? void 0 : ws.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws == null ? void 0 : ws.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{ ...contentScript, id }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{ ...contentScript, id }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      var _a2, _b2;
      const hasJs = (_a2 = contentScript.js) == null ? void 0 : _a2.find((js) => {
        var _a3;
        return (_a3 = cs.js) == null ? void 0 : _a3.includes(js);
      });
      const hasCss = (_b2 = contentScript.css) == null ? void 0 : _b2.find((css) => {
        var _a3;
        return (_a3 = cs.css) == null ? void 0 : _a3.includes(css);
      });
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;
  return result$1;
})();
background;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIvY2hyb21lLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIiwiLi4vLi4vZW50cnlwb2ludHMvYmFja2dyb3VuZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgYnJvd3NlciA9IChcbiAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkID09IG51bGwgPyBnbG9iYWxUaGlzLmNocm9tZSA6IChcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgZ2xvYmFsVGhpcy5icm93c2VyXG4gIClcbik7XG4iLCJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcbiAgaWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG4gIHJldHVybiBhcmc7XG59XG4iLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIiwiaW1wb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9IGZyb20gXCJ3eHQvc2FuZGJveFwiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKHtcbiAgbWFpbigpIHtcbiAgICBsZXQgY3RybEhlbGQgPSBmYWxzZTtcbiAgICBsZXQgY3RybFJlc2V0VGltZW91dDogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsID0gbnVsbDtcblxuICAgIGNvbnN0IGRlYnVnZ2VyQXR0YWNoZWQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICBjaHJvbWUudGFicy5vblJlbW92ZWQuYWRkTGlzdGVuZXIoKHRhYklkKSA9PiB7XG4gICAgICBkZWJ1Z2dlckF0dGFjaGVkLmRlbGV0ZSh0YWJJZCk7XG4gICAgfSk7XG5cbiAgICAvLyBTYXZlIHdpbmRvdyBib3VuZHMgYmVmb3JlIGZ1bGxzY3JlZW4gc28gd2UgY2FuIHJlc3RvcmUgb24gZXhpdFxuICAgIGludGVyZmFjZSBXaW5Cb3VuZHMgeyB0b3A6IG51bWJlcjsgbGVmdDogbnVtYmVyOyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlcjsgfVxuICAgIGNvbnN0IHNhdmVkQm91bmRzID0gbmV3IE1hcDxudW1iZXIsIFdpbkJvdW5kcz4oKTtcblxuICAgIGNvbnN0IHNhdmVCb3VuZHMgPSAod2luOiBjaHJvbWUud2luZG93cy5XaW5kb3cpID0+IHtcbiAgICAgIGlmICh3aW4uaWQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgICAgaWYgKHdpbi50b3AgIT09IHVuZGVmaW5lZCAmJiB3aW4ubGVmdCAhPT0gdW5kZWZpbmVkICYmIHdpbi53aWR0aCAhPT0gdW5kZWZpbmVkICYmIHdpbi5oZWlnaHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzYXZlZEJvdW5kcy5zZXQod2luLmlkLCB7IHRvcDogd2luLnRvcCwgbGVmdDogd2luLmxlZnQsIHdpZHRoOiB3aW4ud2lkdGgsIGhlaWdodDogd2luLmhlaWdodCB9KTtcbiAgICAgICAgY29uc29sZS5sb2coXCJbQUYgQkddIHNhdmVkIGJvdW5kcyBmb3Igd2luXCIsIHdpbi5pZCwgd2luLmxlZnQsIHdpbi50b3AsIHdpbi53aWR0aCwgd2luLmhlaWdodCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHJlc3RvcmVCb3VuZHMgPSAod2luSWQ6IG51bWJlcikgPT4ge1xuICAgICAgY29uc3QgYiA9IHNhdmVkQm91bmRzLmdldCh3aW5JZCk7XG4gICAgICBpZiAoYikge1xuICAgICAgICBzYXZlZEJvdW5kcy5kZWxldGUod2luSWQpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIltBRiBCR10gcmVzdG9yaW5nIGJvdW5kcyBmb3Igd2luXCIsIHdpbklkLCBiKTtcbiAgICAgICAgY2hyb21lLndpbmRvd3MudXBkYXRlKHdpbklkLCB7IHN0YXRlOiBcIm5vcm1hbFwiLCB0b3A6IGIudG9wLCBsZWZ0OiBiLmxlZnQsIHdpZHRoOiBiLndpZHRoLCBoZWlnaHQ6IGIuaGVpZ2h0IH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJbQUYgQkddIG5vIHNhdmVkIGJvdW5kcyBmb3Igd2luXCIsIHdpbklkKTtcbiAgICAgICAgY2hyb21lLndpbmRvd3MudXBkYXRlKHdpbklkLCB7IHN0YXRlOiBcIm5vcm1hbFwiIH0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBDbGljayBleHRlbnNpb24gaWNvbiDihpIgb3BlbiBzZXR0aW5ncyBwYWdlXG4gICAgY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xuICAgICAgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBjaHJvbWUucnVudGltZS5nZXRVUkwoXCIvc2V0dGluZ3MuaHRtbFwiKSB9KTtcbiAgICB9KTtcblxuICAgIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gICAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09IFwic2V0TW9kaWZpZXJzXCIpIHtcbiAgICAgICAgY3RybEhlbGQgPSBtZXNzYWdlLmN0cmwgfHwgbWVzc2FnZS5tZXRhIHx8IGZhbHNlO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gXCJnZXRNb2RpZmllclN0YXRlXCIpIHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgY3RybEhlbGQgfSk7XG4gICAgICAgIGlmIChjdHJsUmVzZXRUaW1lb3V0KSBjbGVhclRpbWVvdXQoY3RybFJlc2V0VGltZW91dCk7XG4gICAgICAgIGN0cmxSZXNldFRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHsgY3RybEhlbGQgPSBmYWxzZTsgfSwgMTAwMDApO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSBcInNlbmRGS2V5XCIpIHtcbiAgICAgICAgY29uc3QgdGFiSWQgPSBzZW5kZXIudGFiPy5pZDtcbiAgICAgICAgaWYgKCF0YWJJZCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiW0FGIEJHXSBzZW5kRktleSBmb3IgdGFiXCIsIHRhYklkKTtcblxuICAgICAgICBjb25zdCBzZW5kS2V5ID0gKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0FGIEJHXSBzZW5kaW5nIEYga2V5IHRvIHRhYlwiLCB0YWJJZCk7XG4gICAgICAgICAgY2hyb21lLmRlYnVnZ2VyLnNlbmRDb21tYW5kKHsgdGFiSWQgfSwgXCJJbnB1dC5kaXNwYXRjaEtleUV2ZW50XCIsXG4gICAgICAgICAgICB7IHR5cGU6IFwia2V5RG93blwiLCBrZXk6IFwiZlwiLCBjb2RlOiBcIktleUZcIiwgd2luZG93c1ZpcnR1YWxLZXlDb2RlOiA3MCwgbmF0aXZlVmlydHVhbEtleUNvZGU6IDcwIH0sXG4gICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgIGNocm9tZS5kZWJ1Z2dlci5zZW5kQ29tbWFuZCh7IHRhYklkIH0sIFwiSW5wdXQuZGlzcGF0Y2hLZXlFdmVudFwiLFxuICAgICAgICAgICAgICAgIHsgdHlwZTogXCJrZXlVcFwiLCBrZXk6IFwiZlwiLCBjb2RlOiBcIktleUZcIiwgd2luZG93c1ZpcnR1YWxLZXlDb2RlOiA3MCwgbmF0aXZlVmlydHVhbEtleUNvZGU6IDcwIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGRlYnVnZ2VyQXR0YWNoZWQuaGFzKHRhYklkKSkge1xuICAgICAgICAgIHNlbmRLZXkoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIltBRiBCR10gYXR0YWNoaW5nIGRlYnVnZ2VyIHRvIHRhYlwiLCB0YWJJZCwgXCItIHdhdGNoIGZvciBDaHJvbWUgbm90aWZpY2F0aW9uIVwiKTtcbiAgICAgICAgICBjaHJvbWUuZGVidWdnZXIuYXR0YWNoKHsgdGFiSWQgfSwgXCIxLjNcIiwgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltBRiBCR10gZGVidWdnZXIgYXR0YWNoIEZBSUxFRDpcIiwgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIltBRiBCR10gZGVidWdnZXIgYXR0YWNoZWQgT0tcIik7XG4gICAgICAgICAgICBkZWJ1Z2dlckF0dGFjaGVkLmFkZCh0YWJJZCk7XG4gICAgICAgICAgICBzZW5kS2V5KCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAobWVzc2FnZS5hY3Rpb24gPT09IFwidG9nZ2xlV2luZG93RnVsbHNjcmVlblwiKSB7XG4gICAgICAgIGNocm9tZS53aW5kb3dzLmdldEN1cnJlbnQoKHdpbikgPT4ge1xuICAgICAgICAgIGlmICh3aW4uaWQgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgICAgICAgIGlmICh3aW4uc3RhdGUgPT09IFwiZnVsbHNjcmVlblwiKSB7XG4gICAgICAgICAgICByZXN0b3JlQm91bmRzKHdpbi5pZCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNhdmVCb3VuZHMod2luKTtcbiAgICAgICAgICAgIGNocm9tZS53aW5kb3dzLnVwZGF0ZSh3aW4uaWQsIHsgc3RhdGU6IFwiZnVsbHNjcmVlblwiIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1lc3NhZ2UuYWN0aW9uID09PSBcInNldFdpbmRvd0Z1bGxzY3JlZW5cIikge1xuICAgICAgICBjaHJvbWUud2luZG93cy5nZXRDdXJyZW50KCh3aW4pID0+IHtcbiAgICAgICAgICBpZiAod2luLmlkID09PSB1bmRlZmluZWQgfHwgd2luLnN0YXRlID09PSBcImZ1bGxzY3JlZW5cIikgcmV0dXJuO1xuICAgICAgICAgIHNhdmVCb3VuZHMod2luKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIltBRiBCR10gZW50ZXJpbmcgZnVsbHNjcmVlbiBmb3Igd2luXCIsIHdpbi5pZCk7XG4gICAgICAgICAgY2hyb21lLndpbmRvd3MudXBkYXRlKHdpbi5pZCwgeyBzdGF0ZTogXCJmdWxsc2NyZWVuXCIgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChtZXNzYWdlLmFjdGlvbiA9PT0gXCJleGl0V2luZG93RnVsbHNjcmVlblwiKSB7XG4gICAgICAgIGNocm9tZS53aW5kb3dzLmdldEN1cnJlbnQoKHdpbikgPT4ge1xuICAgICAgICAgIGlmICh3aW4uaWQgPT09IHVuZGVmaW5lZCB8fCB3aW4uc3RhdGUgIT09IFwiZnVsbHNjcmVlblwiKSByZXR1cm47XG4gICAgICAgICAgY29uc29sZS5sb2coXCJbQUYgQkddIGV4aXRpbmcgZnVsbHNjcmVlbiBmb3Igd2luXCIsIHdpbi5pZCk7XG4gICAgICAgICAgcmVzdG9yZUJvdW5kcyh3aW4uaWQpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gIH0sXG59KTtcbiJdLCJuYW1lcyI6WyJfYSJdLCJtYXBwaW5ncyI6Ijs7O0FBQU8sUUFBTTtBQUFBO0FBQUEsTUFFWCxzQkFBVyxZQUFYLG1CQUFvQixZQUFwQixtQkFBNkIsT0FBTSxPQUFPLFdBQVc7QUFBQTtBQUFBLE1BRW5ELFdBQVc7QUFBQTtBQUFBO0FDSlIsV0FBUyxpQkFBaUIsS0FBSztBQUNwQyxRQUFJLE9BQU8sUUFBUSxPQUFPLFFBQVEsV0FBWSxRQUFPLEVBQUUsTUFBTSxJQUFHO0FBQ2hFLFdBQU87QUFBQSxFQUNUO0FDRkEsTUFBSSxnQkFBZ0IsTUFBTTtBQUFBLElBQ3hCLFlBQVksY0FBYztBQUN4QixVQUFJLGlCQUFpQixjQUFjO0FBQ2pDLGFBQUssWUFBWTtBQUNqQixhQUFLLGtCQUFrQixDQUFDLEdBQUcsY0FBYyxTQUFTO0FBQ2xELGFBQUssZ0JBQWdCO0FBQ3JCLGFBQUssZ0JBQWdCO0FBQUEsTUFDdkIsT0FBTztBQUNMLGNBQU0sU0FBUyx1QkFBdUIsS0FBSyxZQUFZO0FBQ3ZELFlBQUksVUFBVTtBQUNaLGdCQUFNLElBQUksb0JBQW9CLGNBQWMsa0JBQWtCO0FBQ2hFLGNBQU0sQ0FBQyxHQUFHLFVBQVUsVUFBVSxRQUFRLElBQUk7QUFDMUMseUJBQWlCLGNBQWMsUUFBUTtBQUN2Qyx5QkFBaUIsY0FBYyxRQUFRO0FBRXZDLGFBQUssa0JBQWtCLGFBQWEsTUFBTSxDQUFDLFFBQVEsT0FBTyxJQUFJLENBQUMsUUFBUTtBQUN2RSxhQUFLLGdCQUFnQjtBQUNyQixhQUFLLGdCQUFnQjtBQUFBLE1BQ3ZCO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUyxLQUFLO0FBQ1osVUFBSSxLQUFLO0FBQ1AsZUFBTztBQUNULFlBQU0s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QUEsSUFBQSxtQ0FBQSxPQUFBLFFBQUEsVUFBQSxPQUFBO0FBQ0E7QUFBQSxjQUFBO0FBRUYsc0JBQUEsSUFBQSw4QkFBQTtBQUNBLCtCQUFBLElBQUEsS0FBQTtBQUNBLHNCQUFBO0FBQUEsWUFBUSxDQUFBO0FBQUEsVUFDVDtBQUVILGlCQUFBO0FBQUEsUUFBTztBQUdULFlBQUEsUUFBQSxXQUFBLDBCQUFBO0FBQ0UsaUJBQUEsUUFBQSxXQUFBLENBQUEsUUFBQTtBQUNFLGdCQUFBLElBQUEsT0FBQSxPQUFBO0FBQ0EsZ0JBQUEsSUFBQSxVQUFBLGNBQUE7QUFDRSw0QkFBQSxJQUFBLEVBQUE7QUFBQSxZQUFvQixPQUFBO0FBRXBCLHlCQUFBLEdBQUE7QUFDQSxxQkFBQSxRQUFBLE9BQUEsSUFBQSxJQUFBLEVBQUEsT0FBQSxjQUFBO0FBQUEsWUFBcUQ7QUFBQSxVQUN2RCxDQUFBO0FBRUYsaUJBQUE7QUFBQSxRQUFPO0FBR1QsWUFBQSxRQUFBLFdBQUEsdUJBQUE7QUFDRSxpQkFBQSxRQUFBLFdBQUEsQ0FBQSxRQUFBO0FBQ0UsZ0JBQUEsSUFBQSxPQUFBLFVBQUEsSUFBQSxVQUFBLGFBQUE7QUFDQSx1QkFBQSxHQUFBO0FBQ0Esb0JBQUEsSUFBQSx1Q0FBQSxJQUFBLEVBQUE7QUFDQSxtQkFBQSxRQUFBLE9BQUEsSUFBQSxJQUFBLEVBQUEsT0FBQSxjQUFBO0FBQUEsVUFBcUQsQ0FBQTtBQUV2RCxpQkFBQTtBQUFBLFFBQU87QUFHVCxZQUFBLFFBQUEsV0FBQSx3QkFBQTtBQUNFLGlCQUFBLFFBQUEsV0FBQSxDQUFBLFFBQUE7QUFDRSxnQkFBQSxJQUFBLE9BQUEsVUFBQSxJQUFBLFVBQUEsYUFBQTtBQUNBLG9CQUFBLElBQUEsc0NBQUEsSUFBQSxFQUFBO0FBQ0EsMEJBQUEsSUFBQSxFQUFBO0FBQUEsVUFBb0IsQ0FBQTtBQUV0QixpQkFBQTtBQUFBLFFBQU87QUFHVCxlQUFBO0FBQUEsTUFBTyxDQUFBO0FBQUEsSUFDUjtBQUFBLEVBRUwsQ0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDJdfQ==
