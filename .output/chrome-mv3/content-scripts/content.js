var content = (function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  var _a, _b, _c, _d;
  const browser$1 = (
    // @ts-expect-error
    ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) == null ? globalThis.chrome : (
      // @ts-expect-error
      globalThis.browser
    )
  );
  const browser = ((_d = (_c = globalThis.browser) == null ? void 0 : _c.runtime) == null ? void 0 : _d.id) ? globalThis.browser : globalThis.chrome;
  const E_CANCELED = new Error("request for lock canceled");
  var __awaiter$2 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result2) {
        result2.done ? resolve(result2.value) : adopt(result2.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  class Semaphore {
    constructor(_value, _cancelError = E_CANCELED) {
      this._value = _value;
      this._cancelError = _cancelError;
      this._queue = [];
      this._weightedWaiters = [];
    }
    acquire(weight = 1, priority = 0) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      return new Promise((resolve, reject) => {
        const task = { resolve, reject, weight, priority };
        const i = findIndexFromEnd(this._queue, (other) => priority <= other.priority);
        if (i === -1 && weight <= this._value) {
          this._dispatchItem(task);
        } else {
          this._queue.splice(i + 1, 0, task);
        }
      });
    }
    runExclusive(callback_1) {
      return __awaiter$2(this, arguments, void 0, function* (callback, weight = 1, priority = 0) {
        const [value, release] = yield this.acquire(weight, priority);
        try {
          return yield callback(value);
        } finally {
          release();
        }
      });
    }
    waitForUnlock(weight = 1, priority = 0) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      if (this._couldLockImmediately(weight, priority)) {
        return Promise.resolve();
      } else {
        return new Promise((resolve) => {
          if (!this._weightedWaiters[weight - 1])
            this._weightedWaiters[weight - 1] = [];
          insertSorted(this._weightedWaiters[weight - 1], { resolve, priority });
        });
      }
    }
    isLocked() {
      return this._value <= 0;
    }
    getValue() {
      return this._value;
    }
    setValue(value) {
      this._value = value;
      this._dispatchQueue();
    }
    release(weight = 1) {
      if (weight <= 0)
        throw new Error(`invalid weight ${weight}: must be positive`);
      this._value += weight;
      this._dispatchQueue();
    }
    cancel() {
      this._queue.forEach((entry) => entry.reject(this._cancelError));
      this._queue = [];
    }
    _dispatchQueue() {
      this._drainUnlockWaiters();
      while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
        this._dispatchItem(this._queue.shift());
        this._drainUnlockWaiters();
      }
    }
    _dispatchItem(item) {
      const previousValue = this._value;
      this._value -= item.weight;
      item.resolve([previousValue, this._newReleaser(item.weight)]);
    }
    _newReleaser(weight) {
      let called = false;
      return () => {
        if (called)
          return;
        called = true;
        this.release(weight);
      };
    }
    _drainUnlockWaiters() {
      if (this._queue.length === 0) {
        for (let weight = this._value; weight > 0; weight--) {
          const waiters = this._weightedWaiters[weight - 1];
          if (!waiters)
            continue;
          waiters.forEach((waiter) => waiter.resolve());
          this._weightedWaiters[weight - 1] = [];
        }
      } else {
        const queuedPriority = this._queue[0].priority;
        for (let weight = this._value; weight > 0; weight--) {
          const waiters = this._weightedWaiters[weight - 1];
          if (!waiters)
            continue;
          const i = waiters.findIndex((waiter) => waiter.priority <= queuedPriority);
          (i === -1 ? waiters : waiters.splice(0, i)).forEach(((waiter) => waiter.resolve()));
        }
      }
    }
    _couldLockImmediately(weight, priority) {
      return (this._queue.length === 0 || this._queue[0].priority < priority) && weight <= this._value;
    }
  }
  function insertSorted(a, v) {
    const i = findIndexFromEnd(a, (other) => v.priority <= other.priority);
    a.splice(i + 1, 0, v);
  }
  function findIndexFromEnd(a, predicate) {
    for (let i = a.length - 1; i >= 0; i--) {
      if (predicate(a[i])) {
        return i;
      }
    }
    return -1;
  }
  var __awaiter$1 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result2) {
        result2.done ? resolve(result2.value) : adopt(result2.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  class Mutex {
    constructor(cancelError) {
      this._semaphore = new Semaphore(1, cancelError);
    }
    acquire() {
      return __awaiter$1(this, arguments, void 0, function* (priority = 0) {
        const [, releaser] = yield this._semaphore.acquire(1, priority);
        return releaser;
      });
    }
    runExclusive(callback, priority = 0) {
      return this._semaphore.runExclusive(() => callback(), 1, priority);
    }
    isLocked() {
      return this._semaphore.isLocked();
    }
    waitForUnlock(priority = 0) {
      return this._semaphore.waitForUnlock(1, priority);
    }
    release() {
      if (this._semaphore.isLocked())
        this._semaphore.release();
    }
    cancel() {
      return this._semaphore.cancel();
    }
  }
  var has = Object.prototype.hasOwnProperty;
  function dequal(foo, bar) {
    var ctor, len;
    if (foo === bar) return true;
    if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
      if (ctor === Date) return foo.getTime() === bar.getTime();
      if (ctor === RegExp) return foo.toString() === bar.toString();
      if (ctor === Array) {
        if ((len = foo.length) === bar.length) {
          while (len-- && dequal(foo[len], bar[len])) ;
        }
        return len === -1;
      }
      if (!ctor || typeof foo === "object") {
        len = 0;
        for (ctor in foo) {
          if (has.call(foo, ctor) && ++len && !has.call(bar, ctor)) return false;
          if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor])) return false;
        }
        return Object.keys(bar).length === len;
      }
    }
    return foo !== foo && bar !== bar;
  }
  const storage = createStorage();
  function createStorage() {
    const drivers = {
      local: createDriver("local"),
      session: createDriver("session"),
      sync: createDriver("sync"),
      managed: createDriver("managed")
    };
    const getDriver = (area) => {
      const driver = drivers[area];
      if (driver == null) {
        const areaNames = Object.keys(drivers).join(", ");
        throw Error(`Invalid area "${area}". Options: ${areaNames}`);
      }
      return driver;
    };
    const resolveKey = (key) => {
      const deliminatorIndex = key.indexOf(":");
      const driverArea = key.substring(0, deliminatorIndex);
      const driverKey = key.substring(deliminatorIndex + 1);
      if (driverKey == null) throw Error(`Storage key should be in the form of "area:key", but received "${key}"`);
      return {
        driverArea,
        driverKey,
        driver: getDriver(driverArea)
      };
    };
    const getMetaKey = (key) => key + "$";
    const mergeMeta = (oldMeta, newMeta) => {
      const newFields = { ...oldMeta };
      Object.entries(newMeta).forEach(([key, value]) => {
        if (value == null) delete newFields[key];
        else newFields[key] = value;
      });
      return newFields;
    };
    const getValueOrFallback = (value, fallback) => value ?? fallback ?? null;
    const getMetaValue = (properties) => typeof properties === "object" && !Array.isArray(properties) ? properties : {};
    const getItem = async (driver, driverKey, opts) => {
      return getValueOrFallback(await driver.getItem(driverKey), (opts == null ? void 0 : opts.fallback) ?? (opts == null ? void 0 : opts.defaultValue));
    };
    const getMeta = async (driver, driverKey) => {
      const metaKey = getMetaKey(driverKey);
      return getMetaValue(await driver.getItem(metaKey));
    };
    const setItem = async (driver, driverKey, value) => {
      await driver.setItem(driverKey, value ?? null);
    };
    const setMeta = async (driver, driverKey, properties) => {
      const metaKey = getMetaKey(driverKey);
      const existingFields = getMetaValue(await driver.getItem(metaKey));
      await driver.setItem(metaKey, mergeMeta(existingFields, properties));
    };
    const removeItem = async (driver, driverKey, opts) => {
      await driver.removeItem(driverKey);
      if (opts == null ? void 0 : opts.removeMeta) {
        const metaKey = getMetaKey(driverKey);
        await driver.removeItem(metaKey);
      }
    };
    const removeMeta = async (driver, driverKey, properties) => {
      const metaKey = getMetaKey(driverKey);
      if (properties == null) await driver.removeItem(metaKey);
      else {
        const newFields = getMetaValue(await driver.getItem(metaKey));
        [properties].flat().forEach((field) => delete newFields[field]);
        await driver.setItem(metaKey, newFields);
      }
    };
    const watch = (driver, driverKey, cb) => driver.watch(driverKey, cb);
    return {
      getItem: async (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        return await getItem(driver, driverKey, opts);
      },
      getItems: async (keys) => {
        const areaToKeyMap = /* @__PURE__ */ new Map();
        const keyToOptsMap = /* @__PURE__ */ new Map();
        const orderedKeys = [];
        keys.forEach((key) => {
          let keyStr;
          let opts;
          if (typeof key === "string") keyStr = key;
          else if ("getValue" in key) {
            keyStr = key.key;
            opts = { fallback: key.fallback };
          } else {
            keyStr = key.key;
            opts = key.options;
          }
          orderedKeys.push(keyStr);
          const { driverArea, driverKey } = resolveKey(keyStr);
          const areaKeys = areaToKeyMap.get(driverArea) ?? [];
          areaToKeyMap.set(driverArea, areaKeys.concat(driverKey));
          keyToOptsMap.set(keyStr, opts);
        });
        const resultsMap = /* @__PURE__ */ new Map();
        await Promise.all(Array.from(areaToKeyMap.entries()).map(async ([driverArea, keys2]) => {
          (await drivers[driverArea].getItems(keys2)).forEach((driverResult) => {
            const key = `${driverArea}:${driverResult.key}`;
            const opts = keyToOptsMap.get(key);
            const value = getValueOrFallback(driverResult.value, (opts == null ? void 0 : opts.fallback) ?? (opts == null ? void 0 : opts.defaultValue));
            resultsMap.set(key, value);
          });
        }));
        return orderedKeys.map((key) => ({
          key,
          value: resultsMap.get(key)
        }));
      },
      getMeta: async (key) => {
        const { driver, driverKey } = resolveKey(key);
        return await getMeta(driver, driverKey);
      },
      getMetas: async (args) => {
        const keys = args.map((arg) => {
          const key = typeof arg === "string" ? arg : arg.key;
          const { driverArea, driverKey } = resolveKey(key);
          return {
            key,
            driverArea,
            driverKey,
            driverMetaKey: getMetaKey(driverKey)
          };
        });
        const areaToDriverMetaKeysMap = keys.reduce((map, key) => {
          var _a2;
          map[_a2 = key.driverArea] ?? (map[_a2] = []);
          map[key.driverArea].push(key);
          return map;
        }, {});
        const resultsMap = {};
        await Promise.all(Object.entries(areaToDriverMetaKeysMap).map(async ([area, keys2]) => {
          const areaRes = await browser.storage[area].get(keys2.map((key) => key.driverMetaKey));
          keys2.forEach((key) => {
            resultsMap[key.key] = areaRes[key.driverMetaKey] ?? {};
          });
        }));
        return keys.map((key) => ({
          key: key.key,
          meta: resultsMap[key.key]
        }));
      },
      setItem: async (key, value) => {
        const { driver, driverKey } = resolveKey(key);
        await setItem(driver, driverKey, value);
      },
      setItems: async (items) => {
        const areaToKeyValueMap = {};
        items.forEach((item) => {
          const { driverArea, driverKey } = resolveKey("key" in item ? item.key : item.item.key);
          areaToKeyValueMap[driverArea] ?? (areaToKeyValueMap[driverArea] = []);
          areaToKeyValueMap[driverArea].push({
            key: driverKey,
            value: item.value
          });
        });
        await Promise.all(Object.entries(areaToKeyValueMap).map(async ([driverArea, values]) => {
          await getDriver(driverArea).setItems(values);
        }));
      },
      setMeta: async (key, properties) => {
        const { driver, driverKey } = resolveKey(key);
        await setMeta(driver, driverKey, properties);
      },
      setMetas: async (items) => {
        const areaToMetaUpdatesMap = {};
        items.forEach((item) => {
          const { driverArea, driverKey } = resolveKey("key" in item ? item.key : item.item.key);
          areaToMetaUpdatesMap[driverArea] ?? (areaToMetaUpdatesMap[driverArea] = []);
          areaToMetaUpdatesMap[driverArea].push({
            key: driverKey,
            properties: item.meta
          });
        });
        await Promise.all(Object.entries(areaToMetaUpdatesMap).map(async ([storageArea, updates]) => {
          const driver = getDriver(storageArea);
          const metaKeys = updates.map(({ key }) => getMetaKey(key));
          const existingMetas = await driver.getItems(metaKeys);
          const existingMetaMap = Object.fromEntries(existingMetas.map(({ key, value }) => [key, getMetaValue(value)]));
          const metaUpdates = updates.map(({ key, properties }) => {
            const metaKey = getMetaKey(key);
            return {
              key: metaKey,
              value: mergeMeta(existingMetaMap[metaKey] ?? {}, properties)
            };
          });
          await driver.setItems(metaUpdates);
        }));
      },
      removeItem: async (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        await removeItem(driver, driverKey, opts);
      },
      removeItems: async (keys) => {
        const areaToKeysMap = {};
        keys.forEach((key) => {
          let keyStr;
          let opts;
          if (typeof key === "string") keyStr = key;
          else if ("getValue" in key) keyStr = key.key;
          else if ("item" in key) {
            keyStr = key.item.key;
            opts = key.options;
          } else {
            keyStr = key.key;
            opts = key.options;
          }
          const { driverArea, driverKey } = resolveKey(keyStr);
          areaToKeysMap[driverArea] ?? (areaToKeysMap[driverArea] = []);
          areaToKeysMap[driverArea].push(driverKey);
          if (opts == null ? void 0 : opts.removeMeta) areaToKeysMap[driverArea].push(getMetaKey(driverKey));
        });
        await Promise.all(Object.entries(areaToKeysMap).map(async ([driverArea, keys2]) => {
          await getDriver(driverArea).removeItems(keys2);
        }));
      },
      clear: async (base) => {
        await getDriver(base).clear();
      },
      removeMeta: async (key, properties) => {
        const { driver, driverKey } = resolveKey(key);
        await removeMeta(driver, driverKey, properties);
      },
      snapshot: async (base, opts) => {
        var _a2;
        const data = await getDriver(base).snapshot();
        (_a2 = opts == null ? void 0 : opts.excludeKeys) == null ? void 0 : _a2.forEach((key) => {
          delete data[key];
          delete data[getMetaKey(key)];
        });
        return data;
      },
      restoreSnapshot: async (base, data) => {
        await getDriver(base).restoreSnapshot(data);
      },
      watch: (key, cb) => {
        const { driver, driverKey } = resolveKey(key);
        return watch(driver, driverKey, cb);
      },
      unwatch() {
        Object.values(drivers).forEach((driver) => {
          driver.unwatch();
        });
      },
      defineItem: (key, opts) => {
        const { driver, driverKey } = resolveKey(key);
        const { version: targetVersion = 1, migrations = {}, onMigrationComplete, debug = false } = opts ?? {};
        if (targetVersion < 1) throw Error("Storage item version cannot be less than 1. Initial versions should be set to 1, not 0.");
        let needsVersionSet = false;
        const migrate = async () => {
          var _a2;
          const driverMetaKey = getMetaKey(driverKey);
          const [{ value }, { value: meta }] = await driver.getItems([driverKey, driverMetaKey]);
          needsVersionSet = value == null && (meta == null ? void 0 : meta.v) == null && !!targetVersion;
          if (value == null) return;
          const currentVersion = (meta == null ? void 0 : meta.v) ?? 1;
          if (currentVersion > targetVersion) throw Error(`Version downgrade detected (v${currentVersion} -> v${targetVersion}) for "${key}"`);
          if (currentVersion === targetVersion) return;
          if (debug) console.debug(`[@wxt-dev/storage] Running storage migration for ${key}: v${currentVersion} -> v${targetVersion}`);
          const migrationsToRun = Array.from({ length: targetVersion - currentVersion }, (_, i) => currentVersion + i + 1);
          let migratedValue = value;
          for (const migrateToVersion of migrationsToRun) try {
            migratedValue = await ((_a2 = migrations == null ? void 0 : migrations[migrateToVersion]) == null ? void 0 : _a2.call(migrations, migratedValue)) ?? migratedValue;
            if (debug) console.debug(`[@wxt-dev/storage] Storage migration processed for version: v${migrateToVersion}`);
          } catch (err) {
            throw new MigrationError(key, migrateToVersion, { cause: err });
          }
          await driver.setItems([{
            key: driverKey,
            value: migratedValue
          }, {
            key: driverMetaKey,
            value: {
              ...meta,
              v: targetVersion
            }
          }]);
          if (debug) console.debug(`[@wxt-dev/storage] Storage migration completed for ${key} v${targetVersion}`, { migratedValue });
          onMigrationComplete == null ? void 0 : onMigrationComplete(migratedValue, targetVersion);
        };
        const migrationsDone = (opts == null ? void 0 : opts.migrations) == null ? Promise.resolve() : migrate().catch((err) => {
          console.error(`[@wxt-dev/storage] Migration failed for ${key}`, err);
        });
        const initMutex = new Mutex();
        const getFallback = () => (opts == null ? void 0 : opts.fallback) ?? (opts == null ? void 0 : opts.defaultValue) ?? null;
        const getOrInitValue = () => initMutex.runExclusive(async () => {
          const value = await driver.getItem(driverKey);
          if (value != null || (opts == null ? void 0 : opts.init) == null) return value;
          const newValue = await opts.init();
          await driver.setItem(driverKey, newValue);
          if (value == null && targetVersion > 1) await setMeta(driver, driverKey, { v: targetVersion });
          return newValue;
        });
        migrationsDone.then(getOrInitValue);
        return {
          key,
          get defaultValue() {
            return getFallback();
          },
          get fallback() {
            return getFallback();
          },
          getValue: async () => {
            await migrationsDone;
            if (opts == null ? void 0 : opts.init) return await getOrInitValue();
            else return await getItem(driver, driverKey, opts);
          },
          getMeta: async () => {
            await migrationsDone;
            return await getMeta(driver, driverKey);
          },
          setValue: async (value) => {
            await migrationsDone;
            if (needsVersionSet) {
              needsVersionSet = false;
              await Promise.all([setItem(driver, driverKey, value), setMeta(driver, driverKey, { v: targetVersion })]);
            } else await setItem(driver, driverKey, value);
          },
          setMeta: async (properties) => {
            await migrationsDone;
            return await setMeta(driver, driverKey, properties);
          },
          removeValue: async (opts2) => {
            await migrationsDone;
            return await removeItem(driver, driverKey, opts2);
          },
          removeMeta: async (properties) => {
            await migrationsDone;
            return await removeMeta(driver, driverKey, properties);
          },
          watch: (cb) => watch(driver, driverKey, (newValue, oldValue) => cb(newValue ?? getFallback(), oldValue ?? getFallback())),
          migrate
        };
      }
    };
  }
  function createDriver(storageArea) {
    const getStorageArea = () => {
      if (browser.runtime == null) throw Error(`'wxt/storage' must be loaded in a web extension environment

 - If thrown during a build, see https://github.com/wxt-dev/wxt/issues/371
 - If thrown during tests, mock 'wxt/browser' correctly. See https://wxt.dev/guide/go-further/testing.html
`);
      if (browser.storage == null) throw Error("You must add the 'storage' permission to your manifest to use 'wxt/storage'");
      const area = browser.storage[storageArea];
      if (area == null) throw Error(`"browser.storage.${storageArea}" is undefined`);
      return area;
    };
    const watchListeners = /* @__PURE__ */ new Set();
    return {
      getItem: async (key) => {
        return (await getStorageArea().get(key))[key];
      },
      getItems: async (keys) => {
        const result2 = await getStorageArea().get(keys);
        return keys.map((key) => ({
          key,
          value: result2[key] ?? null
        }));
      },
      setItem: async (key, value) => {
        if (value == null) await getStorageArea().remove(key);
        else await getStorageArea().set({ [key]: value });
      },
      setItems: async (values) => {
        const map = values.reduce((map2, { key, value }) => {
          map2[key] = value;
          return map2;
        }, {});
        await getStorageArea().set(map);
      },
      removeItem: async (key) => {
        await getStorageArea().remove(key);
      },
      removeItems: async (keys) => {
        await getStorageArea().remove(keys);
      },
      clear: async () => {
        await getStorageArea().clear();
      },
      snapshot: async () => {
        return await getStorageArea().get();
      },
      restoreSnapshot: async (data) => {
        await getStorageArea().set(data);
      },
      watch(key, cb) {
        const listener = (changes) => {
          const change = changes[key];
          if (change == null || dequal(change.newValue, change.oldValue)) return;
          cb(change.newValue ?? null, change.oldValue ?? null);
        };
        getStorageArea().onChanged.addListener(listener);
        watchListeners.add(listener);
        return () => {
          getStorageArea().onChanged.removeListener(listener);
          watchListeners.delete(listener);
        };
      },
      unwatch() {
        watchListeners.forEach((listener) => {
          getStorageArea().onChanged.removeListener(listener);
        });
        watchListeners.clear();
      }
    };
  }
  var MigrationError = class extends Error {
    constructor(key, version, options) {
      super(`v${version} migration failed for "${key}"`, options);
      this.key = key;
      this.version = version;
    }
  };
  const defaultStore = {
    env: "",
    enabled: true,
    rippleEnabled: true,
    smartCursorEnabled: true,
    strictSafety: true,
    longPressDelay: 200,
    primaryColor: "#00FFFF",
    topEdgeExitEnabled: true,
    autoFullscreenEnabled: true,
    oneWayFullscreen: false,
    autoFullscreenOnNewVideo: true,
    fullscreenVideo: true
  };
  const store = storage.defineItem("sync:store", {
    fallback: defaultStore
  });
  content;
  function defineContentScript(definition2) {
    return definition2;
  }
  const log = (...args) => console.log("[AF]", ...args);
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    async main() {
      log("content script loading...");
      let isEnabled = (await store.getValue()).enabled;
      let autoFullscreenEnabled = (await store.getValue()).autoFullscreenEnabled;
      let oneWayFullscreen = (await store.getValue()).oneWayFullscreen;
      let autoFullscreenOnNewVideo = (await store.getValue()).autoFullscreenOnNewVideo;
      let strictSafety = (await store.getValue()).strictSafety;
      let longPressDelay = (await store.getValue()).longPressDelay;
      let topEdgeExitEnabled = (await store.getValue()).topEdgeExitEnabled;
      let rippleEnabled = (await store.getValue()).rippleEnabled;
      let primaryColor = (await store.getValue()).primaryColor || "#00FFFF";
      log("loaded. enabled=", isEnabled, "delay=", longPressDelay);
      let newTabIntent = false;
      let lastFullscreenedVideo = null;
      let lastFullscreenedUrl = "";
      const MMB_KEY = "af_mmb_intent";
      document.addEventListener(
        "keydown",
        (e) => {
          if (e.getModifierState("Control") || e.getModifierState("Meta") || e.getModifierState("Alt")) {
            newTabIntent = true;
          }
        },
        true
      );
      document.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey) {
          browser$1.runtime.sendMessage({ action: "setModifiers", ctrl: true });
        }
      });
      document.addEventListener("keyup", (e) => {
        if (!e.ctrlKey && !e.metaKey) {
          browser$1.runtime.sendMessage({ action: "setModifiers", ctrl: false });
        }
      });
      const TOP_EDGE_THRESHOLD = 10;
      document.addEventListener(
        "mousemove",
        (e) => {
          if (!topEdgeExitEnabled) return;
          if (!isEnabled) return;
          if (e.clientY <= TOP_EDGE_THRESHOLD) {
            log("TOP EDGE HIT y=" + e.clientY);
            browser$1.runtime.sendMessage({ action: "exitWindowFullscreen" });
          }
        },
        true
      );
      const isInteractive = (target) => {
        if (!strictSafety) return false;
        const el = target;
        if (!el) return false;
        let node = el;
        while (node && node !== document.body) {
          const tag = node.tagName;
          if (tag === "A" || tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "LABEL" || node.getAttribute("role") === "button" || node.getAttribute("role") === "link" || node.isContentEditable) {
            log("interactive element blocked:", tag, node);
            return true;
          }
          node = node.parentElement;
        }
        return false;
      };
      let chargeTimer = null;
      let chargeStartX = 0;
      let chargeStartY = 0;
      let chargeRingEl = null;
      let chargeRingAnim = null;
      const CHARGE_RING_SIZE = 44;
      const CHARGE_RING_STROKE = 3;
      const showChargeRing = (x, y, duration) => {
        removeChargeRing();
        if (!rippleEnabled) return;
        const el = document.createElement("div");
        const size = CHARGE_RING_SIZE;
        const r = (size - CHARGE_RING_STROKE * 2) / 2;
        const cx = size / 2;
        const circumference = 2 * Math.PI * r;
        el.style.cssText = `
        position:fixed;
        left:${x - size / 2}px;
        top:${y - size / 2}px;
        width:${size}px;
        height:${size}px;
        pointer-events:none;
        z-index:2147483647;
      `;
        el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cx}" r="${r}" fill="none"
          stroke="rgba(255,255,255,0.15)" stroke-width="${CHARGE_RING_STROKE}"/>
        <circle class="af-ring" cx="${cx}" cy="${cx}" r="${r}" fill="none"
          stroke="${primaryColor}" stroke-width="${CHARGE_RING_STROKE}"
          stroke-linecap="round" stroke-dasharray="${circumference}"
          stroke-dashoffset="${circumference}"
          transform="rotate(-90 ${cx} ${cx})"/>
      </svg>`;
        document.body.appendChild(el);
        chargeRingEl = el;
        const ring = el.querySelector(".af-ring");
        if (!ring) return;
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - (1 - progress) * (1 - progress);
          ring.style.strokeDashoffset = String(circumference * (1 - eased));
          el.style.opacity = String(0.4 + eased * 0.5);
          if (progress < 1) {
            chargeRingAnim = requestAnimationFrame(tick);
          }
        };
        chargeRingAnim = requestAnimationFrame(tick);
      };
      const removeChargeRing = () => {
        if (chargeRingAnim) {
          cancelAnimationFrame(chargeRingAnim);
          chargeRingAnim = null;
        }
        if (chargeRingEl) {
          chargeRingEl.remove();
          chargeRingEl = null;
        }
      };
      const completeChargeRing = () => {
        if (chargeRingAnim) {
          cancelAnimationFrame(chargeRingAnim);
          chargeRingAnim = null;
        }
        if (chargeRingEl) {
          chargeRingEl.style.transition = "opacity 0.15s ease-out, transform 0.15s ease-out";
          chargeRingEl.style.opacity = "0";
          chargeRingEl.style.transform = "scale(1.3)";
          const el = chargeRingEl;
          setTimeout(() => el.remove(), 150);
          chargeRingEl = null;
        }
      };
      document.addEventListener(
        "mousedown",
        (e) => {
          const hasModifier = e.ctrlKey || e.metaKey || e.altKey || e.button === 1 || e.getModifierState("Control") || e.getModifierState("Meta") || e.getModifierState("Alt");
          if (hasModifier) {
            newTabIntent = true;
            browser$1.storage.local.set({ [MMB_KEY]: { url: location.href } }).catch(() => {
            });
            browser$1.runtime.sendMessage({ action: "setModifiers", ctrl: true });
            return;
          }
          if (!isEnabled) return;
          if (e.button !== 0) return;
          if (isInteractive(e.target)) {
            log("blocked: interactive element");
            return;
          }
          if (chargeTimer) {
            clearTimeout(chargeTimer);
            chargeTimer = null;
          }
          chargeStartX = e.clientX;
          chargeStartY = e.clientY;
          if (longPressDelay === 0) {
            browser$1.runtime.sendMessage({ action: "setWindowFullscreen" });
          } else {
            showChargeRing(e.clientX, e.clientY, longPressDelay);
            chargeTimer = setTimeout(() => {
              chargeTimer = null;
              completeChargeRing();
              browser$1.runtime.sendMessage({ action: "setWindowFullscreen" });
            }, longPressDelay);
          }
        },
        true
      );
      document.addEventListener(
        "mousemove",
        (e) => {
          if (!chargeTimer) return;
          const dx = Math.abs(e.clientX - chargeStartX);
          const dy = Math.abs(e.clientY - chargeStartY);
          if (dx > 50 || dy > 50) {
            clearTimeout(chargeTimer);
            chargeTimer = null;
            removeChargeRing();
          }
        },
        true
      );
      document.addEventListener(
        "mouseup",
        () => {
          if (chargeTimer) {
            clearTimeout(chargeTimer);
            chargeTimer = null;
            removeChargeRing();
          }
        },
        true
      );
      window.addEventListener("popstate", () => {
        newTabIntent = false;
        browser$1.storage.local.remove(MMB_KEY).catch(() => {
        });
      });
      const origPushState = history.pushState;
      const origReplaceState = history.replaceState;
      history.pushState = function(...args) {
        origPushState.apply(this, args);
        newTabIntent = false;
        browser$1.storage.local.remove(MMB_KEY).catch(() => {
        });
      };
      history.replaceState = function(...args) {
        origReplaceState.apply(this, args);
        newTabIntent = false;
        browser$1.storage.local.remove(MMB_KEY).catch(() => {
        });
      };
      window.addEventListener("beforeunload", () => {
        browser$1.storage.local.remove(MMB_KEY).catch(() => {
        });
      });
      document.addEventListener(
        "play",
        (e) => {
          if (!isEnabled || !autoFullscreenEnabled) return;
          if (newTabIntent) return;
          const video = e.target;
          if (!(video instanceof HTMLVideoElement)) return;
          if (video.offsetWidth < 200 || video.offsetHeight < 150) return;
          const src = video.currentSrc || video.src;
          if (!src) return;
          if (oneWayFullscreen && document.fullscreenElement) return;
          if (src === lastFullscreenedUrl) return;
          const elementChanged = video !== lastFullscreenedVideo;
          if (!elementChanged && !autoFullscreenOnNewVideo) return;
          lastFullscreenedVideo = video;
          lastFullscreenedUrl = src;
          browser$1.runtime.sendMessage({ action: "setWindowFullscreen" });
        },
        true
      );
      for (let i = 0; i < 5; i++) {
        const resp = await browser$1.runtime.sendMessage({
          action: "getModifierState"
        });
        if (resp == null ? void 0 : resp.ctrlHeld) {
          newTabIntent = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      try {
        const stored = await browser$1.storage.local.get(MMB_KEY);
        const entry = stored == null ? void 0 : stored[MMB_KEY];
        if ((entry == null ? void 0 : entry.url) === location.href) {
          newTabIntent = true;
        } else if (entry) {
          browser$1.storage.local.remove(MMB_KEY).catch(() => {
          });
        }
      } catch {
      }
      if (isEnabled && autoFullscreenEnabled && !newTabIntent) {
        const mainVideo = document.querySelector("video");
        if (mainVideo) {
          lastFullscreenedVideo = mainVideo;
          lastFullscreenedUrl = mainVideo.currentSrc || mainVideo.src || "";
        }
        browser$1.runtime.sendMessage({ action: "setWindowFullscreen" });
      }
      const style = document.createElement("style");
      style.textContent = `
      .Chrome-Full-Screen-Exit-Instruction { display: none !important; }
      .Full-Screen-Exit-Instruction { display: none !important; }
    `;
      document.head.appendChild(style);
      let settingsTimeout = null;
      store.watch((newValue) => {
        isEnabled = newValue.enabled;
        autoFullscreenEnabled = newValue.autoFullscreenEnabled;
        oneWayFullscreen = newValue.oneWayFullscreen;
        autoFullscreenOnNewVideo = newValue.autoFullscreenOnNewVideo;
        strictSafety = newValue.strictSafety;
        longPressDelay = newValue.longPressDelay;
        topEdgeExitEnabled = newValue.topEdgeExitEnabled;
        rippleEnabled = newValue.rippleEnabled;
        primaryColor = newValue.primaryColor || "#00FFFF";
        if (!isEnabled) {
          if (settingsTimeout) clearTimeout(settingsTimeout);
          settingsTimeout = setTimeout(() => {
            browser$1.runtime.sendMessage({ action: "exitWindowFullscreen" });
          }, 100);
        }
      });
    }
  });
  content;
  function print$1(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  const _WxtLocationChangeEvent = class _WxtLocationChangeEvent extends Event {
    constructor(newUrl, oldUrl) {
      super(_WxtLocationChangeEvent.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  __publicField(_WxtLocationChangeEvent, "EVENT_NAME", getUniqueEventName("wxt:locationchange"));
  let WxtLocationChangeEvent = _WxtLocationChangeEvent;
  function getUniqueEventName(eventName) {
    var _a2;
    return `${(_a2 = browser$1 == null ? void 0 : browser$1.runtime) == null ? void 0 : _a2.id}:${"content"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return {
      /**
       * Ensure the location watcher is actively looking for URL changes. If it's already watching,
       * this is a noop.
       */
      run() {
        if (interval != null) return;
        oldUrl = new URL(location.href);
        interval = ctx.setInterval(() => {
          let newUrl = new URL(location.href);
          if (newUrl.href !== oldUrl.href) {
            window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
            oldUrl = newUrl;
          }
        }, 1e3);
      }
    };
  }
  const _ContentScriptContext = class _ContentScriptContext {
    constructor(contentScriptName, options) {
      __publicField(this, "isTopFrame", window.self === window.top);
      __publicField(this, "abortController");
      __publicField(this, "locationWatcher", createLocationWatcher(this));
      __publicField(this, "receivedMessageIds", /* @__PURE__ */ new Set());
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else {
        this.listenForNewerScripts();
      }
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser$1.runtime.id == null) {
        this.notifyInvalidated();
      }
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
     * Add a listener that is called when the content script's context is invalidated.
     *
     * @returns A function to remove the listener.
     *
     * @example
     * browser.runtime.onMessage.addListener(cb);
     * const removeInvalidatedListener = ctx.onInvalidated(() => {
     *   browser.runtime.onMessage.removeListener(cb);
     * })
     * // ...
     * removeInvalidatedListener();
     */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
     * Return a promise that never resolves. Useful if you have an async function that shouldn't run
     * after the context is expired.
     *
     * @example
     * const getValueFromStorage = async () => {
     *   if (ctx.isInvalid) return ctx.block();
     *
     *   // ...
     * }
     */
    block() {
      return new Promise(() => {
      });
    }
    /**
     * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
     */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
     * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
     */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
     * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
     * invalidated.
     */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
     * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
     * invalidated.
     */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      var _a2;
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      (_a2 = target.addEventListener) == null ? void 0 : _a2.call(
        target,
        type.startsWith("wxt:") ? getUniqueEventName(type) : type,
        handler,
        {
          ...options,
          signal: this.signal
        }
      );
    }
    /**
     * @internal
     * Abort the abort controller and execute all `onInvalidated` listeners.
     */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(
        `Content script "${this.contentScriptName}" context invalidated`
      );
    }
    stopOldScripts() {
      window.postMessage(
        {
          type: _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
          contentScriptName: this.contentScriptName,
          messageId: Math.random().toString(36).slice(2)
        },
        "*"
      );
    }
    verifyScriptStartedEvent(event) {
      var _a2, _b2, _c2;
      const isScriptStartedEvent = ((_a2 = event.data) == null ? void 0 : _a2.type) === _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = ((_b2 = event.data) == null ? void 0 : _b2.contentScriptName) === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has((_c2 = event.data) == null ? void 0 : _c2.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && (options == null ? void 0 : options.ignoreFirstEvent)) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  };
  __publicField(_ContentScriptContext, "SCRIPT_STARTED_MESSAGE_TYPE", getUniqueEventName(
    "wxt:content-script-started"
  ));
  let ContentScriptContext = _ContentScriptContext;
  const nullKey = Symbol("null");
  let keyCounter = 0;
  class ManyKeysMap extends Map {
    constructor() {
      super();
      this._objectHashes = /* @__PURE__ */ new WeakMap();
      this._symbolHashes = /* @__PURE__ */ new Map();
      this._publicKeys = /* @__PURE__ */ new Map();
      const [pairs] = arguments;
      if (pairs === null || pairs === void 0) {
        return;
      }
      if (typeof pairs[Symbol.iterator] !== "function") {
        throw new TypeError(typeof pairs + " is not iterable (cannot read property Symbol(Symbol.iterator))");
      }
      for (const [keys, value] of pairs) {
        this.set(keys, value);
      }
    }
    _getPublicKeys(keys, create = false) {
      if (!Array.isArray(keys)) {
        throw new TypeError("The keys parameter must be an array");
      }
      const privateKey = this._getPrivateKey(keys, create);
      let publicKey;
      if (privateKey && this._publicKeys.has(privateKey)) {
        publicKey = this._publicKeys.get(privateKey);
      } else if (create) {
        publicKey = [...keys];
        this._publicKeys.set(privateKey, publicKey);
      }
      return { privateKey, publicKey };
    }
    _getPrivateKey(keys, create = false) {
      const privateKeys = [];
      for (let key of keys) {
        if (key === null) {
          key = nullKey;
        }
        const hashes = typeof key === "object" || typeof key === "function" ? "_objectHashes" : typeof key === "symbol" ? "_symbolHashes" : false;
        if (!hashes) {
          privateKeys.push(key);
        } else if (this[hashes].has(key)) {
          privateKeys.push(this[hashes].get(key));
        } else if (create) {
          const privateKey = `@@mkm-ref-${keyCounter++}@@`;
          this[hashes].set(key, privateKey);
          privateKeys.push(privateKey);
        } else {
          return false;
        }
      }
      return JSON.stringify(privateKeys);
    }
    set(keys, value) {
      const { publicKey } = this._getPublicKeys(keys, true);
      return super.set(publicKey, value);
    }
    get(keys) {
      const { publicKey } = this._getPublicKeys(keys);
      return super.get(publicKey);
    }
    has(keys) {
      const { publicKey } = this._getPublicKeys(keys);
      return super.has(publicKey);
    }
    delete(keys) {
      const { publicKey, privateKey } = this._getPublicKeys(keys);
      return Boolean(publicKey && super.delete(publicKey) && this._publicKeys.delete(privateKey));
    }
    clear() {
      super.clear();
      this._symbolHashes.clear();
      this._publicKeys.clear();
    }
    get [Symbol.toStringTag]() {
      return "ManyKeysMap";
    }
    get size() {
      return super.size;
    }
  }
  new ManyKeysMap();
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
  const result = (async () => {
    try {
      initPlugins();
      const { main, ...options } = definition;
      const ctx = new ContentScriptContext("content", options);
      return await main(ctx);
    } catch (err) {
      logger.error(
        `The content script "${"content"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
})();
content;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIvY2hyb21lLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvYXN5bmMtbXV0ZXgvaW5kZXgubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2RlcXVhbC9saXRlL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9zdG9yYWdlL2Rpc3QvaW5kZXgubWpzIiwiLi4vLi4vLi4vdXRpbHMvc3RvcmUudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3Qvc2FuZGJveC9kZWZpbmUtY29udGVudC1zY3JpcHQubWpzIiwiLi4vLi4vLi4vZW50cnlwb2ludHMvY29udGVudC50cyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L3V0aWxzL2xvZ2dlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvY2xpZW50L2NvbnRlbnQtc2NyaXB0cy9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9jbGllbnQvY29udGVudC1zY3JpcHRzL2xvY2F0aW9uLXdhdGNoZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2NsaWVudC9jb250ZW50LXNjcmlwdHMvY29udGVudC1zY3JpcHQtY29udGV4dC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvbWFueS1rZXlzLW1hcC9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AMW5hdHN1L3dhaXQtZWxlbWVudC9kaXN0L2luZGV4Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgYnJvd3NlciA9IChcbiAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkID09IG51bGwgPyBnbG9iYWxUaGlzLmNocm9tZSA6IChcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgZ2xvYmFsVGhpcy5icm93c2VyXG4gIClcbik7XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJjb25zdCBFX1RJTUVPVVQgPSBuZXcgRXJyb3IoJ3RpbWVvdXQgd2hpbGUgd2FpdGluZyBmb3IgbXV0ZXggdG8gYmVjb21lIGF2YWlsYWJsZScpO1xuY29uc3QgRV9BTFJFQURZX0xPQ0tFRCA9IG5ldyBFcnJvcignbXV0ZXggYWxyZWFkeSBsb2NrZWQnKTtcbmNvbnN0IEVfQ0FOQ0VMRUQgPSBuZXcgRXJyb3IoJ3JlcXVlc3QgZm9yIGxvY2sgY2FuY2VsZWQnKTtcblxudmFyIF9fYXdhaXRlciQyID0gKHVuZGVmaW5lZCAmJiB1bmRlZmluZWQuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5jbGFzcyBTZW1hcGhvcmUge1xuICAgIGNvbnN0cnVjdG9yKF92YWx1ZSwgX2NhbmNlbEVycm9yID0gRV9DQU5DRUxFRCkge1xuICAgICAgICB0aGlzLl92YWx1ZSA9IF92YWx1ZTtcbiAgICAgICAgdGhpcy5fY2FuY2VsRXJyb3IgPSBfY2FuY2VsRXJyb3I7XG4gICAgICAgIHRoaXMuX3F1ZXVlID0gW107XG4gICAgICAgIHRoaXMuX3dlaWdodGVkV2FpdGVycyA9IFtdO1xuICAgIH1cbiAgICBhY3F1aXJlKHdlaWdodCA9IDEsIHByaW9yaXR5ID0gMCkge1xuICAgICAgICBpZiAod2VpZ2h0IDw9IDApXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgd2VpZ2h0ICR7d2VpZ2h0fTogbXVzdCBiZSBwb3NpdGl2ZWApO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGFzayA9IHsgcmVzb2x2ZSwgcmVqZWN0LCB3ZWlnaHQsIHByaW9yaXR5IH07XG4gICAgICAgICAgICBjb25zdCBpID0gZmluZEluZGV4RnJvbUVuZCh0aGlzLl9xdWV1ZSwgKG90aGVyKSA9PiBwcmlvcml0eSA8PSBvdGhlci5wcmlvcml0eSk7XG4gICAgICAgICAgICBpZiAoaSA9PT0gLTEgJiYgd2VpZ2h0IDw9IHRoaXMuX3ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gTmVlZHMgaW1tZWRpYXRlIGRpc3BhdGNoLCBza2lwIHRoZSBxdWV1ZVxuICAgICAgICAgICAgICAgIHRoaXMuX2Rpc3BhdGNoSXRlbSh0YXNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3F1ZXVlLnNwbGljZShpICsgMSwgMCwgdGFzayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBydW5FeGNsdXNpdmUoY2FsbGJhY2tfMSkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyJDIodGhpcywgYXJndW1lbnRzLCB2b2lkIDAsIGZ1bmN0aW9uKiAoY2FsbGJhY2ssIHdlaWdodCA9IDEsIHByaW9yaXR5ID0gMCkge1xuICAgICAgICAgICAgY29uc3QgW3ZhbHVlLCByZWxlYXNlXSA9IHlpZWxkIHRoaXMuYWNxdWlyZSh3ZWlnaHQsIHByaW9yaXR5KTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHlpZWxkIGNhbGxiYWNrKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHdhaXRGb3JVbmxvY2sod2VpZ2h0ID0gMSwgcHJpb3JpdHkgPSAwKSB7XG4gICAgICAgIGlmICh3ZWlnaHQgPD0gMClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgIGlmICh0aGlzLl9jb3VsZExvY2tJbW1lZGlhdGVseSh3ZWlnaHQsIHByaW9yaXR5KSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV0pXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXSA9IFtdO1xuICAgICAgICAgICAgICAgIGluc2VydFNvcnRlZCh0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV0sIHsgcmVzb2x2ZSwgcHJpb3JpdHkgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpc0xvY2tlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlIDw9IDA7XG4gICAgfVxuICAgIGdldFZhbHVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG4gICAgfVxuICAgIHNldFZhbHVlKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX2Rpc3BhdGNoUXVldWUoKTtcbiAgICB9XG4gICAgcmVsZWFzZSh3ZWlnaHQgPSAxKSB7XG4gICAgICAgIGlmICh3ZWlnaHQgPD0gMClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgIHRoaXMuX3ZhbHVlICs9IHdlaWdodDtcbiAgICAgICAgdGhpcy5fZGlzcGF0Y2hRdWV1ZSgpO1xuICAgIH1cbiAgICBjYW5jZWwoKSB7XG4gICAgICAgIHRoaXMuX3F1ZXVlLmZvckVhY2goKGVudHJ5KSA9PiBlbnRyeS5yZWplY3QodGhpcy5fY2FuY2VsRXJyb3IpKTtcbiAgICAgICAgdGhpcy5fcXVldWUgPSBbXTtcbiAgICB9XG4gICAgX2Rpc3BhdGNoUXVldWUoKSB7XG4gICAgICAgIHRoaXMuX2RyYWluVW5sb2NrV2FpdGVycygpO1xuICAgICAgICB3aGlsZSAodGhpcy5fcXVldWUubGVuZ3RoID4gMCAmJiB0aGlzLl9xdWV1ZVswXS53ZWlnaHQgPD0gdGhpcy5fdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2Rpc3BhdGNoSXRlbSh0aGlzLl9xdWV1ZS5zaGlmdCgpKTtcbiAgICAgICAgICAgIHRoaXMuX2RyYWluVW5sb2NrV2FpdGVycygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9kaXNwYXRjaEl0ZW0oaXRlbSkge1xuICAgICAgICBjb25zdCBwcmV2aW91c1ZhbHVlID0gdGhpcy5fdmFsdWU7XG4gICAgICAgIHRoaXMuX3ZhbHVlIC09IGl0ZW0ud2VpZ2h0O1xuICAgICAgICBpdGVtLnJlc29sdmUoW3ByZXZpb3VzVmFsdWUsIHRoaXMuX25ld1JlbGVhc2VyKGl0ZW0ud2VpZ2h0KV0pO1xuICAgIH1cbiAgICBfbmV3UmVsZWFzZXIod2VpZ2h0KSB7XG4gICAgICAgIGxldCBjYWxsZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjYWxsZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMucmVsZWFzZSh3ZWlnaHQpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBfZHJhaW5VbmxvY2tXYWl0ZXJzKCkge1xuICAgICAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB3ZWlnaHQgPSB0aGlzLl92YWx1ZTsgd2VpZ2h0ID4gMDsgd2VpZ2h0LS0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCB3YWl0ZXJzID0gdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzW3dlaWdodCAtIDFdO1xuICAgICAgICAgICAgICAgIGlmICghd2FpdGVycylcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgd2FpdGVycy5mb3JFYWNoKCh3YWl0ZXIpID0+IHdhaXRlci5yZXNvbHZlKCkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgcXVldWVkUHJpb3JpdHkgPSB0aGlzLl9xdWV1ZVswXS5wcmlvcml0eTtcbiAgICAgICAgICAgIGZvciAobGV0IHdlaWdodCA9IHRoaXMuX3ZhbHVlOyB3ZWlnaHQgPiAwOyB3ZWlnaHQtLSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHdhaXRlcnMgPSB0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV07XG4gICAgICAgICAgICAgICAgaWYgKCF3YWl0ZXJzKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBpID0gd2FpdGVycy5maW5kSW5kZXgoKHdhaXRlcikgPT4gd2FpdGVyLnByaW9yaXR5IDw9IHF1ZXVlZFByaW9yaXR5KTtcbiAgICAgICAgICAgICAgICAoaSA9PT0gLTEgPyB3YWl0ZXJzIDogd2FpdGVycy5zcGxpY2UoMCwgaSkpXG4gICAgICAgICAgICAgICAgICAgIC5mb3JFYWNoKCh3YWl0ZXIgPT4gd2FpdGVyLnJlc29sdmUoKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIF9jb3VsZExvY2tJbW1lZGlhdGVseSh3ZWlnaHQsIHByaW9yaXR5KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fcXVldWUubGVuZ3RoID09PSAwIHx8IHRoaXMuX3F1ZXVlWzBdLnByaW9yaXR5IDwgcHJpb3JpdHkpICYmXG4gICAgICAgICAgICB3ZWlnaHQgPD0gdGhpcy5fdmFsdWU7XG4gICAgfVxufVxuZnVuY3Rpb24gaW5zZXJ0U29ydGVkKGEsIHYpIHtcbiAgICBjb25zdCBpID0gZmluZEluZGV4RnJvbUVuZChhLCAob3RoZXIpID0+IHYucHJpb3JpdHkgPD0gb3RoZXIucHJpb3JpdHkpO1xuICAgIGEuc3BsaWNlKGkgKyAxLCAwLCB2KTtcbn1cbmZ1bmN0aW9uIGZpbmRJbmRleEZyb21FbmQoYSwgcHJlZGljYXRlKSB7XG4gICAgZm9yIChsZXQgaSA9IGEubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgaWYgKHByZWRpY2F0ZShhW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG52YXIgX19hd2FpdGVyJDEgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbmNsYXNzIE11dGV4IHtcbiAgICBjb25zdHJ1Y3RvcihjYW5jZWxFcnJvcikge1xuICAgICAgICB0aGlzLl9zZW1hcGhvcmUgPSBuZXcgU2VtYXBob3JlKDEsIGNhbmNlbEVycm9yKTtcbiAgICB9XG4gICAgYWNxdWlyZSgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlciQxKHRoaXMsIGFyZ3VtZW50cywgdm9pZCAwLCBmdW5jdGlvbiogKHByaW9yaXR5ID0gMCkge1xuICAgICAgICAgICAgY29uc3QgWywgcmVsZWFzZXJdID0geWllbGQgdGhpcy5fc2VtYXBob3JlLmFjcXVpcmUoMSwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlbGVhc2VyO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcnVuRXhjbHVzaXZlKGNhbGxiYWNrLCBwcmlvcml0eSA9IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbWFwaG9yZS5ydW5FeGNsdXNpdmUoKCkgPT4gY2FsbGJhY2soKSwgMSwgcHJpb3JpdHkpO1xuICAgIH1cbiAgICBpc0xvY2tlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbWFwaG9yZS5pc0xvY2tlZCgpO1xuICAgIH1cbiAgICB3YWl0Rm9yVW5sb2NrKHByaW9yaXR5ID0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VtYXBob3JlLndhaXRGb3JVbmxvY2soMSwgcHJpb3JpdHkpO1xuICAgIH1cbiAgICByZWxlYXNlKCkge1xuICAgICAgICBpZiAodGhpcy5fc2VtYXBob3JlLmlzTG9ja2VkKCkpXG4gICAgICAgICAgICB0aGlzLl9zZW1hcGhvcmUucmVsZWFzZSgpO1xuICAgIH1cbiAgICBjYW5jZWwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZW1hcGhvcmUuY2FuY2VsKCk7XG4gICAgfVxufVxuXG52YXIgX19hd2FpdGVyID0gKHVuZGVmaW5lZCAmJiB1bmRlZmluZWQuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5mdW5jdGlvbiB3aXRoVGltZW91dChzeW5jLCB0aW1lb3V0LCB0aW1lb3V0RXJyb3IgPSBFX1RJTUVPVVQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBhY3F1aXJlOiAod2VpZ2h0T3JQcmlvcml0eSwgcHJpb3JpdHkpID0+IHtcbiAgICAgICAgICAgIGxldCB3ZWlnaHQ7XG4gICAgICAgICAgICBpZiAoaXNTZW1hcGhvcmUoc3luYykpIHtcbiAgICAgICAgICAgICAgICB3ZWlnaHQgPSB3ZWlnaHRPclByaW9yaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgd2VpZ2h0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHByaW9yaXR5ID0gd2VpZ2h0T3JQcmlvcml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh3ZWlnaHQgIT09IHVuZGVmaW5lZCAmJiB3ZWlnaHQgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgICAgIGxldCBpc1RpbWVvdXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGUgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaXNUaW1lb3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHRpbWVvdXRFcnJvcik7XG4gICAgICAgICAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGlja2V0ID0geWllbGQgKGlzU2VtYXBob3JlKHN5bmMpXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHN5bmMuYWNxdWlyZSh3ZWlnaHQsIHByaW9yaXR5KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBzeW5jLmFjcXVpcmUocHJpb3JpdHkpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGltZW91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsZWFzZSA9IEFycmF5LmlzQXJyYXkodGlja2V0KSA/IHRpY2tldFsxXSA6IHRpY2tldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0aWNrZXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgcnVuRXhjbHVzaXZlKGNhbGxiYWNrLCB3ZWlnaHQsIHByaW9yaXR5KSB7XG4gICAgICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgICAgIGxldCByZWxlYXNlID0gKCkgPT4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpY2tldCA9IHlpZWxkIHRoaXMuYWNxdWlyZSh3ZWlnaHQsIHByaW9yaXR5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGlja2V0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZSA9IHRpY2tldFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB5aWVsZCBjYWxsYmFjayh0aWNrZXRbMF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZSA9IHRpY2tldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB5aWVsZCBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICByZWxlYXNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbGVhc2Uod2VpZ2h0KSB7XG4gICAgICAgICAgICBzeW5jLnJlbGVhc2Uod2VpZ2h0KTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuY2VsKCkge1xuICAgICAgICAgICAgcmV0dXJuIHN5bmMuY2FuY2VsKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHdhaXRGb3JVbmxvY2s6ICh3ZWlnaHRPclByaW9yaXR5LCBwcmlvcml0eSkgPT4ge1xuICAgICAgICAgICAgbGV0IHdlaWdodDtcbiAgICAgICAgICAgIGlmIChpc1NlbWFwaG9yZShzeW5jKSkge1xuICAgICAgICAgICAgICAgIHdlaWdodCA9IHdlaWdodE9yUHJpb3JpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB3ZWlnaHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHkgPSB3ZWlnaHRPclByaW9yaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdlaWdodCAhPT0gdW5kZWZpbmVkICYmIHdlaWdodCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHdlaWdodCAke3dlaWdodH06IG11c3QgYmUgcG9zaXRpdmVgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QodGltZW91dEVycm9yKSwgdGltZW91dCk7XG4gICAgICAgICAgICAgICAgKGlzU2VtYXBob3JlKHN5bmMpXG4gICAgICAgICAgICAgICAgICAgID8gc3luYy53YWl0Rm9yVW5sb2NrKHdlaWdodCwgcHJpb3JpdHkpXG4gICAgICAgICAgICAgICAgICAgIDogc3luYy53YWl0Rm9yVW5sb2NrKHByaW9yaXR5KSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNMb2NrZWQ6ICgpID0+IHN5bmMuaXNMb2NrZWQoKSxcbiAgICAgICAgZ2V0VmFsdWU6ICgpID0+IHN5bmMuZ2V0VmFsdWUoKSxcbiAgICAgICAgc2V0VmFsdWU6ICh2YWx1ZSkgPT4gc3luYy5zZXRWYWx1ZSh2YWx1ZSksXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGlzU2VtYXBob3JlKHN5bmMpIHtcbiAgICByZXR1cm4gc3luYy5nZXRWYWx1ZSAhPT0gdW5kZWZpbmVkO1xufVxuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpc25lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tb2R1bGUtYm91bmRhcnktdHlwZXNcbmZ1bmN0aW9uIHRyeUFjcXVpcmUoc3luYywgYWxyZWFkeUFjcXVpcmVkRXJyb3IgPSBFX0FMUkVBRFlfTE9DS0VEKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICByZXR1cm4gd2l0aFRpbWVvdXQoc3luYywgMCwgYWxyZWFkeUFjcXVpcmVkRXJyb3IpO1xufVxuXG5leHBvcnQgeyBFX0FMUkVBRFlfTE9DS0VELCBFX0NBTkNFTEVELCBFX1RJTUVPVVQsIE11dGV4LCBTZW1hcGhvcmUsIHRyeUFjcXVpcmUsIHdpdGhUaW1lb3V0IH07XG4iLCJ2YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRlcXVhbChmb28sIGJhcikge1xuXHR2YXIgY3RvciwgbGVuO1xuXHRpZiAoZm9vID09PSBiYXIpIHJldHVybiB0cnVlO1xuXG5cdGlmIChmb28gJiYgYmFyICYmIChjdG9yPWZvby5jb25zdHJ1Y3RvcikgPT09IGJhci5jb25zdHJ1Y3Rvcikge1xuXHRcdGlmIChjdG9yID09PSBEYXRlKSByZXR1cm4gZm9vLmdldFRpbWUoKSA9PT0gYmFyLmdldFRpbWUoKTtcblx0XHRpZiAoY3RvciA9PT0gUmVnRXhwKSByZXR1cm4gZm9vLnRvU3RyaW5nKCkgPT09IGJhci50b1N0cmluZygpO1xuXG5cdFx0aWYgKGN0b3IgPT09IEFycmF5KSB7XG5cdFx0XHRpZiAoKGxlbj1mb28ubGVuZ3RoKSA9PT0gYmFyLmxlbmd0aCkge1xuXHRcdFx0XHR3aGlsZSAobGVuLS0gJiYgZGVxdWFsKGZvb1tsZW5dLCBiYXJbbGVuXSkpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxlbiA9PT0gLTE7XG5cdFx0fVxuXG5cdFx0aWYgKCFjdG9yIHx8IHR5cGVvZiBmb28gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRsZW4gPSAwO1xuXHRcdFx0Zm9yIChjdG9yIGluIGZvbykge1xuXHRcdFx0XHRpZiAoaGFzLmNhbGwoZm9vLCBjdG9yKSAmJiArK2xlbiAmJiAhaGFzLmNhbGwoYmFyLCBjdG9yKSkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRpZiAoIShjdG9yIGluIGJhcikgfHwgIWRlcXVhbChmb29bY3Rvcl0sIGJhcltjdG9yXSkpIHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBPYmplY3Qua2V5cyhiYXIpLmxlbmd0aCA9PT0gbGVuO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBmb28gIT09IGZvbyAmJiBiYXIgIT09IGJhcjtcbn1cbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuaW1wb3J0IHsgTXV0ZXggfSBmcm9tIFwiYXN5bmMtbXV0ZXhcIjtcbmltcG9ydCB7IGRlcXVhbCB9IGZyb20gXCJkZXF1YWwvbGl0ZVwiO1xuXG4vLyNyZWdpb24gc3JjL2luZGV4LnRzXG4vKipcbiogU2ltcGxpZmllZCBzdG9yYWdlIEFQSXMgd2l0aCBzdXBwb3J0IGZvciB2ZXJzaW9uZWQgZmllbGRzLCBzbmFwc2hvdHMsIG1ldGFkYXRhLCBhbmQgaXRlbSBkZWZpbml0aW9ucy5cbipcbiogU2VlIFt0aGUgZ3VpZGVdKGh0dHBzOi8vd3h0LmRldi9zdG9yYWdlLmh0bWwpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuKiBAbW9kdWxlIEB3eHQtZGV2L3N0b3JhZ2VcbiovXG5jb25zdCBzdG9yYWdlID0gY3JlYXRlU3RvcmFnZSgpO1xuZnVuY3Rpb24gY3JlYXRlU3RvcmFnZSgpIHtcblx0Y29uc3QgZHJpdmVycyA9IHtcblx0XHRsb2NhbDogY3JlYXRlRHJpdmVyKFwibG9jYWxcIiksXG5cdFx0c2Vzc2lvbjogY3JlYXRlRHJpdmVyKFwic2Vzc2lvblwiKSxcblx0XHRzeW5jOiBjcmVhdGVEcml2ZXIoXCJzeW5jXCIpLFxuXHRcdG1hbmFnZWQ6IGNyZWF0ZURyaXZlcihcIm1hbmFnZWRcIilcblx0fTtcblx0Y29uc3QgZ2V0RHJpdmVyID0gKGFyZWEpID0+IHtcblx0XHRjb25zdCBkcml2ZXIgPSBkcml2ZXJzW2FyZWFdO1xuXHRcdGlmIChkcml2ZXIgPT0gbnVsbCkge1xuXHRcdFx0Y29uc3QgYXJlYU5hbWVzID0gT2JqZWN0LmtleXMoZHJpdmVycykuam9pbihcIiwgXCIpO1xuXHRcdFx0dGhyb3cgRXJyb3IoYEludmFsaWQgYXJlYSBcIiR7YXJlYX1cIi4gT3B0aW9uczogJHthcmVhTmFtZXN9YCk7XG5cdFx0fVxuXHRcdHJldHVybiBkcml2ZXI7XG5cdH07XG5cdGNvbnN0IHJlc29sdmVLZXkgPSAoa2V5KSA9PiB7XG5cdFx0Y29uc3QgZGVsaW1pbmF0b3JJbmRleCA9IGtleS5pbmRleE9mKFwiOlwiKTtcblx0XHRjb25zdCBkcml2ZXJBcmVhID0ga2V5LnN1YnN0cmluZygwLCBkZWxpbWluYXRvckluZGV4KTtcblx0XHRjb25zdCBkcml2ZXJLZXkgPSBrZXkuc3Vic3RyaW5nKGRlbGltaW5hdG9ySW5kZXggKyAxKTtcblx0XHRpZiAoZHJpdmVyS2V5ID09IG51bGwpIHRocm93IEVycm9yKGBTdG9yYWdlIGtleSBzaG91bGQgYmUgaW4gdGhlIGZvcm0gb2YgXCJhcmVhOmtleVwiLCBidXQgcmVjZWl2ZWQgXCIke2tleX1cImApO1xuXHRcdHJldHVybiB7XG5cdFx0XHRkcml2ZXJBcmVhLFxuXHRcdFx0ZHJpdmVyS2V5LFxuXHRcdFx0ZHJpdmVyOiBnZXREcml2ZXIoZHJpdmVyQXJlYSlcblx0XHR9O1xuXHR9O1xuXHRjb25zdCBnZXRNZXRhS2V5ID0gKGtleSkgPT4ga2V5ICsgXCIkXCI7XG5cdGNvbnN0IG1lcmdlTWV0YSA9IChvbGRNZXRhLCBuZXdNZXRhKSA9PiB7XG5cdFx0Y29uc3QgbmV3RmllbGRzID0geyAuLi5vbGRNZXRhIH07XG5cdFx0T2JqZWN0LmVudHJpZXMobmV3TWV0YSkuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG5cdFx0XHRpZiAodmFsdWUgPT0gbnVsbCkgZGVsZXRlIG5ld0ZpZWxkc1trZXldO1xuXHRcdFx0ZWxzZSBuZXdGaWVsZHNba2V5XSA9IHZhbHVlO1xuXHRcdH0pO1xuXHRcdHJldHVybiBuZXdGaWVsZHM7XG5cdH07XG5cdGNvbnN0IGdldFZhbHVlT3JGYWxsYmFjayA9ICh2YWx1ZSwgZmFsbGJhY2spID0+IHZhbHVlID8/IGZhbGxiYWNrID8/IG51bGw7XG5cdGNvbnN0IGdldE1ldGFWYWx1ZSA9IChwcm9wZXJ0aWVzKSA9PiB0eXBlb2YgcHJvcGVydGllcyA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwcm9wZXJ0aWVzKSA/IHByb3BlcnRpZXMgOiB7fTtcblx0Y29uc3QgZ2V0SXRlbSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgb3B0cykgPT4ge1xuXHRcdHJldHVybiBnZXRWYWx1ZU9yRmFsbGJhY2soYXdhaXQgZHJpdmVyLmdldEl0ZW0oZHJpdmVyS2V5KSwgb3B0cz8uZmFsbGJhY2sgPz8gb3B0cz8uZGVmYXVsdFZhbHVlKTtcblx0fTtcblx0Y29uc3QgZ2V0TWV0YSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSkgPT4ge1xuXHRcdGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG5cdFx0cmV0dXJuIGdldE1ldGFWYWx1ZShhd2FpdCBkcml2ZXIuZ2V0SXRlbShtZXRhS2V5KSk7XG5cdH07XG5cdGNvbnN0IHNldEl0ZW0gPSBhc3luYyAoZHJpdmVyLCBkcml2ZXJLZXksIHZhbHVlKSA9PiB7XG5cdFx0YXdhaXQgZHJpdmVyLnNldEl0ZW0oZHJpdmVyS2V5LCB2YWx1ZSA/PyBudWxsKTtcblx0fTtcblx0Y29uc3Qgc2V0TWV0YSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcykgPT4ge1xuXHRcdGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG5cdFx0Y29uc3QgZXhpc3RpbmdGaWVsZHMgPSBnZXRNZXRhVmFsdWUoYXdhaXQgZHJpdmVyLmdldEl0ZW0obWV0YUtleSkpO1xuXHRcdGF3YWl0IGRyaXZlci5zZXRJdGVtKG1ldGFLZXksIG1lcmdlTWV0YShleGlzdGluZ0ZpZWxkcywgcHJvcGVydGllcykpO1xuXHR9O1xuXHRjb25zdCByZW1vdmVJdGVtID0gYXN5bmMgKGRyaXZlciwgZHJpdmVyS2V5LCBvcHRzKSA9PiB7XG5cdFx0YXdhaXQgZHJpdmVyLnJlbW92ZUl0ZW0oZHJpdmVyS2V5KTtcblx0XHRpZiAob3B0cz8ucmVtb3ZlTWV0YSkge1xuXHRcdFx0Y29uc3QgbWV0YUtleSA9IGdldE1ldGFLZXkoZHJpdmVyS2V5KTtcblx0XHRcdGF3YWl0IGRyaXZlci5yZW1vdmVJdGVtKG1ldGFLZXkpO1xuXHRcdH1cblx0fTtcblx0Y29uc3QgcmVtb3ZlTWV0YSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcykgPT4ge1xuXHRcdGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG5cdFx0aWYgKHByb3BlcnRpZXMgPT0gbnVsbCkgYXdhaXQgZHJpdmVyLnJlbW92ZUl0ZW0obWV0YUtleSk7XG5cdFx0ZWxzZSB7XG5cdFx0XHRjb25zdCBuZXdGaWVsZHMgPSBnZXRNZXRhVmFsdWUoYXdhaXQgZHJpdmVyLmdldEl0ZW0obWV0YUtleSkpO1xuXHRcdFx0W3Byb3BlcnRpZXNdLmZsYXQoKS5mb3JFYWNoKChmaWVsZCkgPT4gZGVsZXRlIG5ld0ZpZWxkc1tmaWVsZF0pO1xuXHRcdFx0YXdhaXQgZHJpdmVyLnNldEl0ZW0obWV0YUtleSwgbmV3RmllbGRzKTtcblx0XHR9XG5cdH07XG5cdGNvbnN0IHdhdGNoID0gKGRyaXZlciwgZHJpdmVyS2V5LCBjYikgPT4gZHJpdmVyLndhdGNoKGRyaXZlcktleSwgY2IpO1xuXHRyZXR1cm4ge1xuXHRcdGdldEl0ZW06IGFzeW5jIChrZXksIG9wdHMpID0+IHtcblx0XHRcdGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcblx0XHRcdHJldHVybiBhd2FpdCBnZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCBvcHRzKTtcblx0XHR9LFxuXHRcdGdldEl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuXHRcdFx0Y29uc3QgYXJlYVRvS2V5TWFwID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTtcblx0XHRcdGNvbnN0IGtleVRvT3B0c01hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG5cdFx0XHRjb25zdCBvcmRlcmVkS2V5cyA9IFtdO1xuXHRcdFx0a2V5cy5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRcdFx0bGV0IGtleVN0cjtcblx0XHRcdFx0bGV0IG9wdHM7XG5cdFx0XHRcdGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSBrZXlTdHIgPSBrZXk7XG5cdFx0XHRcdGVsc2UgaWYgKFwiZ2V0VmFsdWVcIiBpbiBrZXkpIHtcblx0XHRcdFx0XHRrZXlTdHIgPSBrZXkua2V5O1xuXHRcdFx0XHRcdG9wdHMgPSB7IGZhbGxiYWNrOiBrZXkuZmFsbGJhY2sgfTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRrZXlTdHIgPSBrZXkua2V5O1xuXHRcdFx0XHRcdG9wdHMgPSBrZXkub3B0aW9ucztcblx0XHRcdFx0fVxuXHRcdFx0XHRvcmRlcmVkS2V5cy5wdXNoKGtleVN0cik7XG5cdFx0XHRcdGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleVN0cik7XG5cdFx0XHRcdGNvbnN0IGFyZWFLZXlzID0gYXJlYVRvS2V5TWFwLmdldChkcml2ZXJBcmVhKSA/PyBbXTtcblx0XHRcdFx0YXJlYVRvS2V5TWFwLnNldChkcml2ZXJBcmVhLCBhcmVhS2V5cy5jb25jYXQoZHJpdmVyS2V5KSk7XG5cdFx0XHRcdGtleVRvT3B0c01hcC5zZXQoa2V5U3RyLCBvcHRzKTtcblx0XHRcdH0pO1xuXHRcdFx0Y29uc3QgcmVzdWx0c01hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG5cdFx0XHRhd2FpdCBQcm9taXNlLmFsbChBcnJheS5mcm9tKGFyZWFUb0tleU1hcC5lbnRyaWVzKCkpLm1hcChhc3luYyAoW2RyaXZlckFyZWEsIGtleXNdKSA9PiB7XG5cdFx0XHRcdChhd2FpdCBkcml2ZXJzW2RyaXZlckFyZWFdLmdldEl0ZW1zKGtleXMpKS5mb3JFYWNoKChkcml2ZXJSZXN1bHQpID0+IHtcblx0XHRcdFx0XHRjb25zdCBrZXkgPSBgJHtkcml2ZXJBcmVhfToke2RyaXZlclJlc3VsdC5rZXl9YDtcblx0XHRcdFx0XHRjb25zdCBvcHRzID0ga2V5VG9PcHRzTWFwLmdldChrZXkpO1xuXHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gZ2V0VmFsdWVPckZhbGxiYWNrKGRyaXZlclJlc3VsdC52YWx1ZSwgb3B0cz8uZmFsbGJhY2sgPz8gb3B0cz8uZGVmYXVsdFZhbHVlKTtcblx0XHRcdFx0XHRyZXN1bHRzTWFwLnNldChrZXksIHZhbHVlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KSk7XG5cdFx0XHRyZXR1cm4gb3JkZXJlZEtleXMubWFwKChrZXkpID0+ICh7XG5cdFx0XHRcdGtleSxcblx0XHRcdFx0dmFsdWU6IHJlc3VsdHNNYXAuZ2V0KGtleSlcblx0XHRcdH0pKTtcblx0XHR9LFxuXHRcdGdldE1ldGE6IGFzeW5jIChrZXkpID0+IHtcblx0XHRcdGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcblx0XHRcdHJldHVybiBhd2FpdCBnZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5KTtcblx0XHR9LFxuXHRcdGdldE1ldGFzOiBhc3luYyAoYXJncykgPT4ge1xuXHRcdFx0Y29uc3Qga2V5cyA9IGFyZ3MubWFwKChhcmcpID0+IHtcblx0XHRcdFx0Y29uc3Qga2V5ID0gdHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIiA/IGFyZyA6IGFyZy5rZXk7XG5cdFx0XHRcdGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0a2V5LFxuXHRcdFx0XHRcdGRyaXZlckFyZWEsXG5cdFx0XHRcdFx0ZHJpdmVyS2V5LFxuXHRcdFx0XHRcdGRyaXZlck1ldGFLZXk6IGdldE1ldGFLZXkoZHJpdmVyS2V5KVxuXHRcdFx0XHR9O1xuXHRcdFx0fSk7XG5cdFx0XHRjb25zdCBhcmVhVG9Ecml2ZXJNZXRhS2V5c01hcCA9IGtleXMucmVkdWNlKChtYXAsIGtleSkgPT4ge1xuXHRcdFx0XHRtYXBba2V5LmRyaXZlckFyZWFdID8/PSBbXTtcblx0XHRcdFx0bWFwW2tleS5kcml2ZXJBcmVhXS5wdXNoKGtleSk7XG5cdFx0XHRcdHJldHVybiBtYXA7XG5cdFx0XHR9LCB7fSk7XG5cdFx0XHRjb25zdCByZXN1bHRzTWFwID0ge307XG5cdFx0XHRhd2FpdCBQcm9taXNlLmFsbChPYmplY3QuZW50cmllcyhhcmVhVG9Ecml2ZXJNZXRhS2V5c01hcCkubWFwKGFzeW5jIChbYXJlYSwga2V5c10pID0+IHtcblx0XHRcdFx0Y29uc3QgYXJlYVJlcyA9IGF3YWl0IGJyb3dzZXIuc3RvcmFnZVthcmVhXS5nZXQoa2V5cy5tYXAoKGtleSkgPT4ga2V5LmRyaXZlck1ldGFLZXkpKTtcblx0XHRcdFx0a2V5cy5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRcdFx0XHRyZXN1bHRzTWFwW2tleS5rZXldID0gYXJlYVJlc1trZXkuZHJpdmVyTWV0YUtleV0gPz8ge307XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSkpO1xuXHRcdFx0cmV0dXJuIGtleXMubWFwKChrZXkpID0+ICh7XG5cdFx0XHRcdGtleToga2V5LmtleSxcblx0XHRcdFx0bWV0YTogcmVzdWx0c01hcFtrZXkua2V5XVxuXHRcdFx0fSkpO1xuXHRcdH0sXG5cdFx0c2V0SXRlbTogYXN5bmMgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcblx0XHRcdGF3YWl0IHNldEl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIHZhbHVlKTtcblx0XHR9LFxuXHRcdHNldEl0ZW1zOiBhc3luYyAoaXRlbXMpID0+IHtcblx0XHRcdGNvbnN0IGFyZWFUb0tleVZhbHVlTWFwID0ge307XG5cdFx0XHRpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KFwia2V5XCIgaW4gaXRlbSA/IGl0ZW0ua2V5IDogaXRlbS5pdGVtLmtleSk7XG5cdFx0XHRcdGFyZWFUb0tleVZhbHVlTWFwW2RyaXZlckFyZWFdID8/PSBbXTtcblx0XHRcdFx0YXJlYVRvS2V5VmFsdWVNYXBbZHJpdmVyQXJlYV0ucHVzaCh7XG5cdFx0XHRcdFx0a2V5OiBkcml2ZXJLZXksXG5cdFx0XHRcdFx0dmFsdWU6IGl0ZW0udmFsdWVcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdGF3YWl0IFByb21pc2UuYWxsKE9iamVjdC5lbnRyaWVzKGFyZWFUb0tleVZhbHVlTWFwKS5tYXAoYXN5bmMgKFtkcml2ZXJBcmVhLCB2YWx1ZXNdKSA9PiB7XG5cdFx0XHRcdGF3YWl0IGdldERyaXZlcihkcml2ZXJBcmVhKS5zZXRJdGVtcyh2YWx1ZXMpO1xuXHRcdFx0fSkpO1xuXHRcdH0sXG5cdFx0c2V0TWV0YTogYXN5bmMgKGtleSwgcHJvcGVydGllcykgPT4ge1xuXHRcdFx0Y29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuXHRcdFx0YXdhaXQgc2V0TWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG5cdFx0fSxcblx0XHRzZXRNZXRhczogYXN5bmMgKGl0ZW1zKSA9PiB7XG5cdFx0XHRjb25zdCBhcmVhVG9NZXRhVXBkYXRlc01hcCA9IHt9O1xuXHRcdFx0aXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuXHRcdFx0XHRjb25zdCB7IGRyaXZlckFyZWEsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShcImtleVwiIGluIGl0ZW0gPyBpdGVtLmtleSA6IGl0ZW0uaXRlbS5rZXkpO1xuXHRcdFx0XHRhcmVhVG9NZXRhVXBkYXRlc01hcFtkcml2ZXJBcmVhXSA/Pz0gW107XG5cdFx0XHRcdGFyZWFUb01ldGFVcGRhdGVzTWFwW2RyaXZlckFyZWFdLnB1c2goe1xuXHRcdFx0XHRcdGtleTogZHJpdmVyS2V5LFxuXHRcdFx0XHRcdHByb3BlcnRpZXM6IGl0ZW0ubWV0YVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdFx0YXdhaXQgUHJvbWlzZS5hbGwoT2JqZWN0LmVudHJpZXMoYXJlYVRvTWV0YVVwZGF0ZXNNYXApLm1hcChhc3luYyAoW3N0b3JhZ2VBcmVhLCB1cGRhdGVzXSkgPT4ge1xuXHRcdFx0XHRjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoc3RvcmFnZUFyZWEpO1xuXHRcdFx0XHRjb25zdCBtZXRhS2V5cyA9IHVwZGF0ZXMubWFwKCh7IGtleSB9KSA9PiBnZXRNZXRhS2V5KGtleSkpO1xuXHRcdFx0XHRjb25zdCBleGlzdGluZ01ldGFzID0gYXdhaXQgZHJpdmVyLmdldEl0ZW1zKG1ldGFLZXlzKTtcblx0XHRcdFx0Y29uc3QgZXhpc3RpbmdNZXRhTWFwID0gT2JqZWN0LmZyb21FbnRyaWVzKGV4aXN0aW5nTWV0YXMubWFwKCh7IGtleSwgdmFsdWUgfSkgPT4gW2tleSwgZ2V0TWV0YVZhbHVlKHZhbHVlKV0pKTtcblx0XHRcdFx0Y29uc3QgbWV0YVVwZGF0ZXMgPSB1cGRhdGVzLm1hcCgoeyBrZXksIHByb3BlcnRpZXMgfSkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGtleSk7XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdGtleTogbWV0YUtleSxcblx0XHRcdFx0XHRcdHZhbHVlOiBtZXJnZU1ldGEoZXhpc3RpbmdNZXRhTWFwW21ldGFLZXldID8/IHt9LCBwcm9wZXJ0aWVzKVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRhd2FpdCBkcml2ZXIuc2V0SXRlbXMobWV0YVVwZGF0ZXMpO1xuXHRcdFx0fSkpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlSXRlbTogYXN5bmMgKGtleSwgb3B0cykgPT4ge1xuXHRcdFx0Y29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuXHRcdFx0YXdhaXQgcmVtb3ZlSXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0cyk7XG5cdFx0fSxcblx0XHRyZW1vdmVJdGVtczogYXN5bmMgKGtleXMpID0+IHtcblx0XHRcdGNvbnN0IGFyZWFUb0tleXNNYXAgPSB7fTtcblx0XHRcdGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XG5cdFx0XHRcdGxldCBrZXlTdHI7XG5cdFx0XHRcdGxldCBvcHRzO1xuXHRcdFx0XHRpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikga2V5U3RyID0ga2V5O1xuXHRcdFx0XHRlbHNlIGlmIChcImdldFZhbHVlXCIgaW4ga2V5KSBrZXlTdHIgPSBrZXkua2V5O1xuXHRcdFx0XHRlbHNlIGlmIChcIml0ZW1cIiBpbiBrZXkpIHtcblx0XHRcdFx0XHRrZXlTdHIgPSBrZXkuaXRlbS5rZXk7XG5cdFx0XHRcdFx0b3B0cyA9IGtleS5vcHRpb25zO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGtleVN0ciA9IGtleS5rZXk7XG5cdFx0XHRcdFx0b3B0cyA9IGtleS5vcHRpb25zO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleVN0cik7XG5cdFx0XHRcdGFyZWFUb0tleXNNYXBbZHJpdmVyQXJlYV0gPz89IFtdO1xuXHRcdFx0XHRhcmVhVG9LZXlzTWFwW2RyaXZlckFyZWFdLnB1c2goZHJpdmVyS2V5KTtcblx0XHRcdFx0aWYgKG9wdHM/LnJlbW92ZU1ldGEpIGFyZWFUb0tleXNNYXBbZHJpdmVyQXJlYV0ucHVzaChnZXRNZXRhS2V5KGRyaXZlcktleSkpO1xuXHRcdFx0fSk7XG5cdFx0XHRhd2FpdCBQcm9taXNlLmFsbChPYmplY3QuZW50cmllcyhhcmVhVG9LZXlzTWFwKS5tYXAoYXN5bmMgKFtkcml2ZXJBcmVhLCBrZXlzXSkgPT4ge1xuXHRcdFx0XHRhd2FpdCBnZXREcml2ZXIoZHJpdmVyQXJlYSkucmVtb3ZlSXRlbXMoa2V5cyk7XG5cdFx0XHR9KSk7XG5cdFx0fSxcblx0XHRjbGVhcjogYXN5bmMgKGJhc2UpID0+IHtcblx0XHRcdGF3YWl0IGdldERyaXZlcihiYXNlKS5jbGVhcigpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlTWV0YTogYXN5bmMgKGtleSwgcHJvcGVydGllcykgPT4ge1xuXHRcdFx0Y29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuXHRcdFx0YXdhaXQgcmVtb3ZlTWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG5cdFx0fSxcblx0XHRzbmFwc2hvdDogYXN5bmMgKGJhc2UsIG9wdHMpID0+IHtcblx0XHRcdGNvbnN0IGRhdGEgPSBhd2FpdCBnZXREcml2ZXIoYmFzZSkuc25hcHNob3QoKTtcblx0XHRcdG9wdHM/LmV4Y2x1ZGVLZXlzPy5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRcdFx0ZGVsZXRlIGRhdGFba2V5XTtcblx0XHRcdFx0ZGVsZXRlIGRhdGFbZ2V0TWV0YUtleShrZXkpXTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblx0XHRyZXN0b3JlU25hcHNob3Q6IGFzeW5jIChiYXNlLCBkYXRhKSA9PiB7XG5cdFx0XHRhd2FpdCBnZXREcml2ZXIoYmFzZSkucmVzdG9yZVNuYXBzaG90KGRhdGEpO1xuXHRcdH0sXG5cdFx0d2F0Y2g6IChrZXksIGNiKSA9PiB7XG5cdFx0XHRjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG5cdFx0XHRyZXR1cm4gd2F0Y2goZHJpdmVyLCBkcml2ZXJLZXksIGNiKTtcblx0XHR9LFxuXHRcdHVud2F0Y2goKSB7XG5cdFx0XHRPYmplY3QudmFsdWVzKGRyaXZlcnMpLmZvckVhY2goKGRyaXZlcikgPT4ge1xuXHRcdFx0XHRkcml2ZXIudW53YXRjaCgpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRkZWZpbmVJdGVtOiAoa2V5LCBvcHRzKSA9PiB7XG5cdFx0XHRjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG5cdFx0XHRjb25zdCB7IHZlcnNpb246IHRhcmdldFZlcnNpb24gPSAxLCBtaWdyYXRpb25zID0ge30sIG9uTWlncmF0aW9uQ29tcGxldGUsIGRlYnVnID0gZmFsc2UgfSA9IG9wdHMgPz8ge307XG5cdFx0XHRpZiAodGFyZ2V0VmVyc2lvbiA8IDEpIHRocm93IEVycm9yKFwiU3RvcmFnZSBpdGVtIHZlcnNpb24gY2Fubm90IGJlIGxlc3MgdGhhbiAxLiBJbml0aWFsIHZlcnNpb25zIHNob3VsZCBiZSBzZXQgdG8gMSwgbm90IDAuXCIpO1xuXHRcdFx0bGV0IG5lZWRzVmVyc2lvblNldCA9IGZhbHNlO1xuXHRcdFx0Y29uc3QgbWlncmF0ZSA9IGFzeW5jICgpID0+IHtcblx0XHRcdFx0Y29uc3QgZHJpdmVyTWV0YUtleSA9IGdldE1ldGFLZXkoZHJpdmVyS2V5KTtcblx0XHRcdFx0Y29uc3QgW3sgdmFsdWUgfSwgeyB2YWx1ZTogbWV0YSB9XSA9IGF3YWl0IGRyaXZlci5nZXRJdGVtcyhbZHJpdmVyS2V5LCBkcml2ZXJNZXRhS2V5XSk7XG5cdFx0XHRcdG5lZWRzVmVyc2lvblNldCA9IHZhbHVlID09IG51bGwgJiYgbWV0YT8udiA9PSBudWxsICYmICEhdGFyZ2V0VmVyc2lvbjtcblx0XHRcdFx0aWYgKHZhbHVlID09IG51bGwpIHJldHVybjtcblx0XHRcdFx0Y29uc3QgY3VycmVudFZlcnNpb24gPSBtZXRhPy52ID8/IDE7XG5cdFx0XHRcdGlmIChjdXJyZW50VmVyc2lvbiA+IHRhcmdldFZlcnNpb24pIHRocm93IEVycm9yKGBWZXJzaW9uIGRvd25ncmFkZSBkZXRlY3RlZCAodiR7Y3VycmVudFZlcnNpb259IC0+IHYke3RhcmdldFZlcnNpb259KSBmb3IgXCIke2tleX1cImApO1xuXHRcdFx0XHRpZiAoY3VycmVudFZlcnNpb24gPT09IHRhcmdldFZlcnNpb24pIHJldHVybjtcblx0XHRcdFx0aWYgKGRlYnVnKSBjb25zb2xlLmRlYnVnKGBbQHd4dC1kZXYvc3RvcmFnZV0gUnVubmluZyBzdG9yYWdlIG1pZ3JhdGlvbiBmb3IgJHtrZXl9OiB2JHtjdXJyZW50VmVyc2lvbn0gLT4gdiR7dGFyZ2V0VmVyc2lvbn1gKTtcblx0XHRcdFx0Y29uc3QgbWlncmF0aW9uc1RvUnVuID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogdGFyZ2V0VmVyc2lvbiAtIGN1cnJlbnRWZXJzaW9uIH0sIChfLCBpKSA9PiBjdXJyZW50VmVyc2lvbiArIGkgKyAxKTtcblx0XHRcdFx0bGV0IG1pZ3JhdGVkVmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0Zm9yIChjb25zdCBtaWdyYXRlVG9WZXJzaW9uIG9mIG1pZ3JhdGlvbnNUb1J1bikgdHJ5IHtcblx0XHRcdFx0XHRtaWdyYXRlZFZhbHVlID0gYXdhaXQgbWlncmF0aW9ucz8uW21pZ3JhdGVUb1ZlcnNpb25dPy4obWlncmF0ZWRWYWx1ZSkgPz8gbWlncmF0ZWRWYWx1ZTtcblx0XHRcdFx0XHRpZiAoZGVidWcpIGNvbnNvbGUuZGVidWcoYFtAd3h0LWRldi9zdG9yYWdlXSBTdG9yYWdlIG1pZ3JhdGlvbiBwcm9jZXNzZWQgZm9yIHZlcnNpb246IHYke21pZ3JhdGVUb1ZlcnNpb259YCk7XG5cdFx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRcdHRocm93IG5ldyBNaWdyYXRpb25FcnJvcihrZXksIG1pZ3JhdGVUb1ZlcnNpb24sIHsgY2F1c2U6IGVyciB9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRhd2FpdCBkcml2ZXIuc2V0SXRlbXMoW3tcblx0XHRcdFx0XHRrZXk6IGRyaXZlcktleSxcblx0XHRcdFx0XHR2YWx1ZTogbWlncmF0ZWRWYWx1ZVxuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0a2V5OiBkcml2ZXJNZXRhS2V5LFxuXHRcdFx0XHRcdHZhbHVlOiB7XG5cdFx0XHRcdFx0XHQuLi5tZXRhLFxuXHRcdFx0XHRcdFx0djogdGFyZ2V0VmVyc2lvblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fV0pO1xuXHRcdFx0XHRpZiAoZGVidWcpIGNvbnNvbGUuZGVidWcoYFtAd3h0LWRldi9zdG9yYWdlXSBTdG9yYWdlIG1pZ3JhdGlvbiBjb21wbGV0ZWQgZm9yICR7a2V5fSB2JHt0YXJnZXRWZXJzaW9ufWAsIHsgbWlncmF0ZWRWYWx1ZSB9KTtcblx0XHRcdFx0b25NaWdyYXRpb25Db21wbGV0ZT8uKG1pZ3JhdGVkVmFsdWUsIHRhcmdldFZlcnNpb24pO1xuXHRcdFx0fTtcblx0XHRcdGNvbnN0IG1pZ3JhdGlvbnNEb25lID0gb3B0cz8ubWlncmF0aW9ucyA9PSBudWxsID8gUHJvbWlzZS5yZXNvbHZlKCkgOiBtaWdyYXRlKCkuY2F0Y2goKGVycikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGBbQHd4dC1kZXYvc3RvcmFnZV0gTWlncmF0aW9uIGZhaWxlZCBmb3IgJHtrZXl9YCwgZXJyKTtcblx0XHRcdH0pO1xuXHRcdFx0Y29uc3QgaW5pdE11dGV4ID0gbmV3IE11dGV4KCk7XG5cdFx0XHRjb25zdCBnZXRGYWxsYmFjayA9ICgpID0+IG9wdHM/LmZhbGxiYWNrID8/IG9wdHM/LmRlZmF1bHRWYWx1ZSA/PyBudWxsO1xuXHRcdFx0Y29uc3QgZ2V0T3JJbml0VmFsdWUgPSAoKSA9PiBpbml0TXV0ZXgucnVuRXhjbHVzaXZlKGFzeW5jICgpID0+IHtcblx0XHRcdFx0Y29uc3QgdmFsdWUgPSBhd2FpdCBkcml2ZXIuZ2V0SXRlbShkcml2ZXJLZXkpO1xuXHRcdFx0XHRpZiAodmFsdWUgIT0gbnVsbCB8fCBvcHRzPy5pbml0ID09IG51bGwpIHJldHVybiB2YWx1ZTtcblx0XHRcdFx0Y29uc3QgbmV3VmFsdWUgPSBhd2FpdCBvcHRzLmluaXQoKTtcblx0XHRcdFx0YXdhaXQgZHJpdmVyLnNldEl0ZW0oZHJpdmVyS2V5LCBuZXdWYWx1ZSk7XG5cdFx0XHRcdGlmICh2YWx1ZSA9PSBudWxsICYmIHRhcmdldFZlcnNpb24gPiAxKSBhd2FpdCBzZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5LCB7IHY6IHRhcmdldFZlcnNpb24gfSk7XG5cdFx0XHRcdHJldHVybiBuZXdWYWx1ZTtcblx0XHRcdH0pO1xuXHRcdFx0bWlncmF0aW9uc0RvbmUudGhlbihnZXRPckluaXRWYWx1ZSk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRrZXksXG5cdFx0XHRcdGdldCBkZWZhdWx0VmFsdWUoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldEZhbGxiYWNrKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldCBmYWxsYmFjaygpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0RmFsbGJhY2soKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0VmFsdWU6IGFzeW5jICgpID0+IHtcblx0XHRcdFx0XHRhd2FpdCBtaWdyYXRpb25zRG9uZTtcblx0XHRcdFx0XHRpZiAob3B0cz8uaW5pdCkgcmV0dXJuIGF3YWl0IGdldE9ySW5pdFZhbHVlKCk7XG5cdFx0XHRcdFx0ZWxzZSByZXR1cm4gYXdhaXQgZ2V0SXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0cyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldE1ldGE6IGFzeW5jICgpID0+IHtcblx0XHRcdFx0XHRhd2FpdCBtaWdyYXRpb25zRG9uZTtcblx0XHRcdFx0XHRyZXR1cm4gYXdhaXQgZ2V0TWV0YShkcml2ZXIsIGRyaXZlcktleSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldFZhbHVlOiBhc3luYyAodmFsdWUpID0+IHtcblx0XHRcdFx0XHRhd2FpdCBtaWdyYXRpb25zRG9uZTtcblx0XHRcdFx0XHRpZiAobmVlZHNWZXJzaW9uU2V0KSB7XG5cdFx0XHRcdFx0XHRuZWVkc1ZlcnNpb25TZXQgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGF3YWl0IFByb21pc2UuYWxsKFtzZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCB2YWx1ZSksIHNldE1ldGEoZHJpdmVyLCBkcml2ZXJLZXksIHsgdjogdGFyZ2V0VmVyc2lvbiB9KV0pO1xuXHRcdFx0XHRcdH0gZWxzZSBhd2FpdCBzZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCB2YWx1ZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldE1ldGE6IGFzeW5jIChwcm9wZXJ0aWVzKSA9PiB7XG5cdFx0XHRcdFx0YXdhaXQgbWlncmF0aW9uc0RvbmU7XG5cdFx0XHRcdFx0cmV0dXJuIGF3YWl0IHNldE1ldGEoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZW1vdmVWYWx1ZTogYXN5bmMgKG9wdHMpID0+IHtcblx0XHRcdFx0XHRhd2FpdCBtaWdyYXRpb25zRG9uZTtcblx0XHRcdFx0XHRyZXR1cm4gYXdhaXQgcmVtb3ZlSXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0cyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlbW92ZU1ldGE6IGFzeW5jIChwcm9wZXJ0aWVzKSA9PiB7XG5cdFx0XHRcdFx0YXdhaXQgbWlncmF0aW9uc0RvbmU7XG5cdFx0XHRcdFx0cmV0dXJuIGF3YWl0IHJlbW92ZU1ldGEoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR3YXRjaDogKGNiKSA9PiB3YXRjaChkcml2ZXIsIGRyaXZlcktleSwgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4gY2IobmV3VmFsdWUgPz8gZ2V0RmFsbGJhY2soKSwgb2xkVmFsdWUgPz8gZ2V0RmFsbGJhY2soKSkpLFxuXHRcdFx0XHRtaWdyYXRlXG5cdFx0XHR9O1xuXHRcdH1cblx0fTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZURyaXZlcihzdG9yYWdlQXJlYSkge1xuXHRjb25zdCBnZXRTdG9yYWdlQXJlYSA9ICgpID0+IHtcblx0XHRpZiAoYnJvd3Nlci5ydW50aW1lID09IG51bGwpIHRocm93IEVycm9yKGAnd3h0L3N0b3JhZ2UnIG11c3QgYmUgbG9hZGVkIGluIGEgd2ViIGV4dGVuc2lvbiBlbnZpcm9ubWVudFxuXG4gLSBJZiB0aHJvd24gZHVyaW5nIGEgYnVpbGQsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vd3h0LWRldi93eHQvaXNzdWVzLzM3MVxuIC0gSWYgdGhyb3duIGR1cmluZyB0ZXN0cywgbW9jayAnd3h0L2Jyb3dzZXInIGNvcnJlY3RseS4gU2VlIGh0dHBzOi8vd3h0LmRldi9ndWlkZS9nby1mdXJ0aGVyL3Rlc3RpbmcuaHRtbFxuYCk7XG5cdFx0aWYgKGJyb3dzZXIuc3RvcmFnZSA9PSBudWxsKSB0aHJvdyBFcnJvcihcIllvdSBtdXN0IGFkZCB0aGUgJ3N0b3JhZ2UnIHBlcm1pc3Npb24gdG8geW91ciBtYW5pZmVzdCB0byB1c2UgJ3d4dC9zdG9yYWdlJ1wiKTtcblx0XHRjb25zdCBhcmVhID0gYnJvd3Nlci5zdG9yYWdlW3N0b3JhZ2VBcmVhXTtcblx0XHRpZiAoYXJlYSA9PSBudWxsKSB0aHJvdyBFcnJvcihgXCJicm93c2VyLnN0b3JhZ2UuJHtzdG9yYWdlQXJlYX1cIiBpcyB1bmRlZmluZWRgKTtcblx0XHRyZXR1cm4gYXJlYTtcblx0fTtcblx0Y29uc3Qgd2F0Y2hMaXN0ZW5lcnMgPSAvKiBAX19QVVJFX18gKi8gbmV3IFNldCgpO1xuXHRyZXR1cm4ge1xuXHRcdGdldEl0ZW06IGFzeW5jIChrZXkpID0+IHtcblx0XHRcdHJldHVybiAoYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5nZXQoa2V5KSlba2V5XTtcblx0XHR9LFxuXHRcdGdldEl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5nZXQoa2V5cyk7XG5cdFx0XHRyZXR1cm4ga2V5cy5tYXAoKGtleSkgPT4gKHtcblx0XHRcdFx0a2V5LFxuXHRcdFx0XHR2YWx1ZTogcmVzdWx0W2tleV0gPz8gbnVsbFxuXHRcdFx0fSkpO1xuXHRcdH0sXG5cdFx0c2V0SXRlbTogYXN5bmMgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGlmICh2YWx1ZSA9PSBudWxsKSBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnJlbW92ZShrZXkpO1xuXHRcdFx0ZWxzZSBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldCh7IFtrZXldOiB2YWx1ZSB9KTtcblx0XHR9LFxuXHRcdHNldEl0ZW1zOiBhc3luYyAodmFsdWVzKSA9PiB7XG5cdFx0XHRjb25zdCBtYXAgPSB2YWx1ZXMucmVkdWNlKChtYXAsIHsga2V5LCB2YWx1ZSB9KSA9PiB7XG5cdFx0XHRcdG1hcFtrZXldID0gdmFsdWU7XG5cdFx0XHRcdHJldHVybiBtYXA7XG5cdFx0XHR9LCB7fSk7XG5cdFx0XHRhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldChtYXApO1xuXHRcdH0sXG5cdFx0cmVtb3ZlSXRlbTogYXN5bmMgKGtleSkgPT4ge1xuXHRcdFx0YXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5KTtcblx0XHR9LFxuXHRcdHJlbW92ZUl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuXHRcdFx0YXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5cyk7XG5cdFx0fSxcblx0XHRjbGVhcjogYXN5bmMgKCkgPT4ge1xuXHRcdFx0YXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5jbGVhcigpO1xuXHRcdH0sXG5cdFx0c25hcHNob3Q6IGFzeW5jICgpID0+IHtcblx0XHRcdHJldHVybiBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLmdldCgpO1xuXHRcdH0sXG5cdFx0cmVzdG9yZVNuYXBzaG90OiBhc3luYyAoZGF0YSkgPT4ge1xuXHRcdFx0YXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5zZXQoZGF0YSk7XG5cdFx0fSxcblx0XHR3YXRjaChrZXksIGNiKSB7XG5cdFx0XHRjb25zdCBsaXN0ZW5lciA9IChjaGFuZ2VzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGNoYW5nZSA9IGNoYW5nZXNba2V5XTtcblx0XHRcdFx0aWYgKGNoYW5nZSA9PSBudWxsIHx8IGRlcXVhbChjaGFuZ2UubmV3VmFsdWUsIGNoYW5nZS5vbGRWYWx1ZSkpIHJldHVybjtcblx0XHRcdFx0Y2IoY2hhbmdlLm5ld1ZhbHVlID8/IG51bGwsIGNoYW5nZS5vbGRWYWx1ZSA/PyBudWxsKTtcblx0XHRcdH07XG5cdFx0XHRnZXRTdG9yYWdlQXJlYSgpLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cdFx0XHR3YXRjaExpc3RlbmVycy5hZGQobGlzdGVuZXIpO1xuXHRcdFx0cmV0dXJuICgpID0+IHtcblx0XHRcdFx0Z2V0U3RvcmFnZUFyZWEoKS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuXHRcdFx0XHR3YXRjaExpc3RlbmVycy5kZWxldGUobGlzdGVuZXIpO1xuXHRcdFx0fTtcblx0XHR9LFxuXHRcdHVud2F0Y2goKSB7XG5cdFx0XHR3YXRjaExpc3RlbmVycy5mb3JFYWNoKChsaXN0ZW5lcikgPT4ge1xuXHRcdFx0XHRnZXRTdG9yYWdlQXJlYSgpLm9uQ2hhbmdlZC5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG5cdFx0XHR9KTtcblx0XHRcdHdhdGNoTGlzdGVuZXJzLmNsZWFyKCk7XG5cdFx0fVxuXHR9O1xufVxudmFyIE1pZ3JhdGlvbkVycm9yID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG5cdGNvbnN0cnVjdG9yKGtleSwgdmVyc2lvbiwgb3B0aW9ucykge1xuXHRcdHN1cGVyKGB2JHt2ZXJzaW9ufSBtaWdyYXRpb24gZmFpbGVkIGZvciBcIiR7a2V5fVwiYCwgb3B0aW9ucyk7XG5cdFx0dGhpcy5rZXkgPSBrZXk7XG5cdFx0dGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcblx0fVxufTtcblxuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBNaWdyYXRpb25FcnJvciwgc3RvcmFnZSB9OyIsImltcG9ydCB7IFN0b3JlIH0gZnJvbSBcIkAvdHlwZXMvdHlwZXNcIjtcbmltcG9ydCB7IHN0b3JhZ2UgfSBmcm9tIFwid3h0L3N0b3JhZ2VcIjtcblxuZXhwb3J0IGNvbnN0IGRlZmF1bHRTdG9yZTogU3RvcmUgPSB7XG4gIGVudjogXCJcIixcbiAgZW5hYmxlZDogdHJ1ZSxcbiAgcmlwcGxlRW5hYmxlZDogdHJ1ZSxcbiAgc21hcnRDdXJzb3JFbmFibGVkOiB0cnVlLFxuICBzdHJpY3RTYWZldHk6IHRydWUsXG4gIGxvbmdQcmVzc0RlbGF5OiAyMDAsXG4gIHByaW1hcnlDb2xvcjogXCIjMDBGRkZGXCIsXG4gIHRvcEVkZ2VFeGl0RW5hYmxlZDogdHJ1ZSxcbiAgYXV0b0Z1bGxzY3JlZW5FbmFibGVkOiB0cnVlLFxuICBvbmVXYXlGdWxsc2NyZWVuOiBmYWxzZSxcbiAgYXV0b0Z1bGxzY3JlZW5Pbk5ld1ZpZGVvOiB0cnVlLFxuICBmdWxsc2NyZWVuVmlkZW86IHRydWUsXG59O1xuXG5leHBvcnQgY29uc3Qgc3RvcmUgPSBzdG9yYWdlLmRlZmluZUl0ZW08U3RvcmU+KFwic3luYzpzdG9yZVwiLCB7XG4gIGZhbGxiYWNrOiBkZWZhdWx0U3RvcmUsXG59KTtcbiIsImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVDb250ZW50U2NyaXB0KGRlZmluaXRpb24pIHtcbiAgcmV0dXJuIGRlZmluaXRpb247XG59XG4iLCJpbXBvcnQgeyBzdG9yZSB9IGZyb20gXCJAL3V0aWxzL3N0b3JlXCI7XG5pbXBvcnQgeyBkZWZpbmVDb250ZW50U2NyaXB0IH0gZnJvbSBcInd4dC9zYW5kYm94XCI7XG5cbmNvbnN0IGxvZyA9ICguLi5hcmdzOiB1bmtub3duW10pID0+IGNvbnNvbGUubG9nKFwiW0FGXVwiLCAuLi5hcmdzKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XG4gIG1hdGNoZXM6IFtcIjxhbGxfdXJscz5cIl0sXG4gIGFzeW5jIG1haW4oKSB7XG4gICAgbG9nKFwiY29udGVudCBzY3JpcHQgbG9hZGluZy4uLlwiKTtcbiAgICBsZXQgaXNFbmFibGVkID0gKGF3YWl0IHN0b3JlLmdldFZhbHVlKCkpLmVuYWJsZWQ7XG4gICAgbGV0IGF1dG9GdWxsc2NyZWVuRW5hYmxlZCA9IChhd2FpdCBzdG9yZS5nZXRWYWx1ZSgpKS5hdXRvRnVsbHNjcmVlbkVuYWJsZWQ7XG4gICAgbGV0IG9uZVdheUZ1bGxzY3JlZW4gPSAoYXdhaXQgc3RvcmUuZ2V0VmFsdWUoKSkub25lV2F5RnVsbHNjcmVlbjtcbiAgICBsZXQgYXV0b0Z1bGxzY3JlZW5Pbk5ld1ZpZGVvID0gKGF3YWl0IHN0b3JlLmdldFZhbHVlKCkpLmF1dG9GdWxsc2NyZWVuT25OZXdWaWRlbztcbiAgICBsZXQgc3RyaWN0U2FmZXR5ID0gKGF3YWl0IHN0b3JlLmdldFZhbHVlKCkpLnN0cmljdFNhZmV0eTtcbiAgICBsZXQgbG9uZ1ByZXNzRGVsYXkgPSAoYXdhaXQgc3RvcmUuZ2V0VmFsdWUoKSkubG9uZ1ByZXNzRGVsYXk7XG4gICAgbGV0IHRvcEVkZ2VFeGl0RW5hYmxlZCA9IChhd2FpdCBzdG9yZS5nZXRWYWx1ZSgpKS50b3BFZGdlRXhpdEVuYWJsZWQ7XG4gICAgbGV0IHJpcHBsZUVuYWJsZWQgPSAoYXdhaXQgc3RvcmUuZ2V0VmFsdWUoKSkucmlwcGxlRW5hYmxlZDtcbiAgICBsZXQgcHJpbWFyeUNvbG9yID0gKGF3YWl0IHN0b3JlLmdldFZhbHVlKCkpLnByaW1hcnlDb2xvciB8fCBcIiMwMEZGRkZcIjtcbiAgICBsb2coXCJsb2FkZWQuIGVuYWJsZWQ9XCIsIGlzRW5hYmxlZCwgXCJkZWxheT1cIiwgbG9uZ1ByZXNzRGVsYXkpO1xuXG4gICAgLy8gLS0tIFN0YXRlIC0tLVxuICAgIGxldCBuZXdUYWJJbnRlbnQgPSBmYWxzZTtcbiAgICBsZXQgbGFzdEZ1bGxzY3JlZW5lZFZpZGVvOiBIVE1MVmlkZW9FbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGxhc3RGdWxsc2NyZWVuZWRVcmwgPSBcIlwiO1xuICAgIGNvbnN0IE1NQl9LRVkgPSBcImFmX21tYl9pbnRlbnRcIjtcblxuICAgIC8vIC0tLSBSZWdpc3RlciBBTEwgZXZlbnQgaGFuZGxlcnMgRklSU1QgLS0tXG5cbiAgICAvLyBQaHlzaWNhbCBtb2RpZmllciBrZXkgZGV0ZWN0aW9uXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwia2V5ZG93blwiLFxuICAgICAgKGUpID0+IHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGUuZ2V0TW9kaWZpZXJTdGF0ZShcIkNvbnRyb2xcIikgfHxcbiAgICAgICAgICBlLmdldE1vZGlmaWVyU3RhdGUoXCJNZXRhXCIpIHx8XG4gICAgICAgICAgZS5nZXRNb2RpZmllclN0YXRlKFwiQWx0XCIpXG4gICAgICAgICkge1xuICAgICAgICAgIG5ld1RhYkludGVudCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB0cnVlLFxuICAgICk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZSkgPT4ge1xuICAgICAgaWYgKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpIHtcbiAgICAgICAgYnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKHsgYWN0aW9uOiBcInNldE1vZGlmaWVyc1wiLCBjdHJsOiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZSkgPT4ge1xuICAgICAgaWYgKCFlLmN0cmxLZXkgJiYgIWUubWV0YUtleSkge1xuICAgICAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyBhY3Rpb246IFwic2V0TW9kaWZpZXJzXCIsIGN0cmw6IGZhbHNlIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gLS0tIFRvcCBlZGdlIGV4aXQgLS0tXG4gICAgY29uc3QgVE9QX0VER0VfVEhSRVNIT0xEID0gMTA7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgXCJtb3VzZW1vdmVcIixcbiAgICAgIChlOiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgIGlmICghdG9wRWRnZUV4aXRFbmFibGVkKSByZXR1cm47XG4gICAgICAgIGlmICghaXNFbmFibGVkKSByZXR1cm47XG4gICAgICAgIC8vIE5PVEU6IG9uZVdheUZ1bGxzY3JlZW4gZG9lcyBOT1QgYmxvY2sgbWFudWFsIGV4aXQgdmlhIHRvcCBlZGdlLlxuICAgICAgICAvLyBJdCBvbmx5IHByZXZlbnRzIGF1dG8tZXhpdCBvbiBuYXZpZ2F0aW9uIChoYW5kbGVkIGluIHBsYXkgaGFuZGxlcikuXG4gICAgICAgIGlmIChlLmNsaWVudFkgPD0gVE9QX0VER0VfVEhSRVNIT0xEKSB7XG4gICAgICAgICAgbG9nKFwiVE9QIEVER0UgSElUIHk9XCIgKyBlLmNsaWVudFkpO1xuICAgICAgICAgIGJyb3dzZXIucnVudGltZS5zZW5kTWVzc2FnZSh7IGFjdGlvbjogXCJleGl0V2luZG93RnVsbHNjcmVlblwiIH0pO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgdHJ1ZSxcbiAgICApO1xuXG4gICAgLy8gLS0tIFN0cmljdCBzYWZldHk6IGNoZWNrIGlmIHRhcmdldCBpcyBpbnRlcmFjdGl2ZSAtLS1cbiAgICBjb25zdCBpc0ludGVyYWN0aXZlID0gKHRhcmdldDogRXZlbnRUYXJnZXQgfCBudWxsKTogYm9vbGVhbiA9PiB7XG4gICAgICBpZiAoIXN0cmljdFNhZmV0eSkgcmV0dXJuIGZhbHNlO1xuICAgICAgY29uc3QgZWwgPSB0YXJnZXQgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgaWYgKCFlbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gV2FsayB1cCB0byBmaW5kIGludGVyYWN0aXZlIGFuY2VzdG9yXG4gICAgICBsZXQgbm9kZTogSFRNTEVsZW1lbnQgfCBudWxsID0gZWw7XG4gICAgICB3aGlsZSAobm9kZSAmJiBub2RlICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgIGNvbnN0IHRhZyA9IG5vZGUudGFnTmFtZTtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRhZyA9PT0gXCJBXCIgfHxcbiAgICAgICAgICB0YWcgPT09IFwiQlVUVE9OXCIgfHxcbiAgICAgICAgICB0YWcgPT09IFwiSU5QVVRcIiB8fFxuICAgICAgICAgIHRhZyA9PT0gXCJTRUxFQ1RcIiB8fFxuICAgICAgICAgIHRhZyA9PT0gXCJURVhUQVJFQVwiIHx8XG4gICAgICAgICAgdGFnID09PSBcIkxBQkVMXCIgfHxcbiAgICAgICAgICBub2RlLmdldEF0dHJpYnV0ZShcInJvbGVcIikgPT09IFwiYnV0dG9uXCIgfHxcbiAgICAgICAgICBub2RlLmdldEF0dHJpYnV0ZShcInJvbGVcIikgPT09IFwibGlua1wiIHx8XG4gICAgICAgICAgbm9kZS5pc0NvbnRlbnRFZGl0YWJsZVxuICAgICAgICApIHtcbiAgICAgICAgICBsb2coXCJpbnRlcmFjdGl2ZSBlbGVtZW50IGJsb2NrZWQ6XCIsIHRhZywgbm9kZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50RWxlbWVudDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgLy8gLS0tIENoYXJnZSByaW5nIC0tLVxuICAgIGxldCBjaGFyZ2VUaW1lcjogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY2hhcmdlU3RhcnRYID0gMDtcbiAgICBsZXQgY2hhcmdlU3RhcnRZID0gMDtcbiAgICBsZXQgY2hhcmdlQ29tcGxldGVkID0gZmFsc2U7XG4gICAgbGV0IGNoYXJnZVJpbmdFbDogSFRNTERpdkVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY2hhcmdlUmluZ0FuaW06IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAgIGNvbnN0IENIQVJHRV9SSU5HX1NJWkUgPSA0NDtcbiAgICBjb25zdCBDSEFSR0VfUklOR19TVFJPS0UgPSAzO1xuXG4gICAgY29uc3Qgc2hvd0NoYXJnZVJpbmcgPSAoeDogbnVtYmVyLCB5OiBudW1iZXIsIGR1cmF0aW9uOiBudW1iZXIpID0+IHtcbiAgICAgIHJlbW92ZUNoYXJnZVJpbmcoKTtcbiAgICAgIGlmICghcmlwcGxlRW5hYmxlZCkgcmV0dXJuO1xuXG4gICAgICBjb25zdCBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICBjb25zdCBzaXplID0gQ0hBUkdFX1JJTkdfU0laRTtcbiAgICAgIGNvbnN0IHIgPSAoc2l6ZSAtIENIQVJHRV9SSU5HX1NUUk9LRSAqIDIpIC8gMjtcbiAgICAgIGNvbnN0IGN4ID0gc2l6ZSAvIDI7XG4gICAgICBjb25zdCBjaXJjdW1mZXJlbmNlID0gMiAqIE1hdGguUEkgKiByO1xuXG4gICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gYFxuICAgICAgICBwb3NpdGlvbjpmaXhlZDtcbiAgICAgICAgbGVmdDoke3ggLSBzaXplIC8gMn1weDtcbiAgICAgICAgdG9wOiR7eSAtIHNpemUgLyAyfXB4O1xuICAgICAgICB3aWR0aDoke3NpemV9cHg7XG4gICAgICAgIGhlaWdodDoke3NpemV9cHg7XG4gICAgICAgIHBvaW50ZXItZXZlbnRzOm5vbmU7XG4gICAgICAgIHotaW5kZXg6MjE0NzQ4MzY0NztcbiAgICAgIGA7XG4gICAgICBlbC5pbm5lckhUTUwgPSBgPHN2ZyB3aWR0aD1cIiR7c2l6ZX1cIiBoZWlnaHQ9XCIke3NpemV9XCIgdmlld0JveD1cIjAgMCAke3NpemV9ICR7c2l6ZX1cIj5cbiAgICAgICAgPGNpcmNsZSBjeD1cIiR7Y3h9XCIgY3k9XCIke2N4fVwiIHI9XCIke3J9XCIgZmlsbD1cIm5vbmVcIlxuICAgICAgICAgIHN0cm9rZT1cInJnYmEoMjU1LDI1NSwyNTUsMC4xNSlcIiBzdHJva2Utd2lkdGg9XCIke0NIQVJHRV9SSU5HX1NUUk9LRX1cIi8+XG4gICAgICAgIDxjaXJjbGUgY2xhc3M9XCJhZi1yaW5nXCIgY3g9XCIke2N4fVwiIGN5PVwiJHtjeH1cIiByPVwiJHtyfVwiIGZpbGw9XCJub25lXCJcbiAgICAgICAgICBzdHJva2U9XCIke3ByaW1hcnlDb2xvcn1cIiBzdHJva2Utd2lkdGg9XCIke0NIQVJHRV9SSU5HX1NUUk9LRX1cIlxuICAgICAgICAgIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtZGFzaGFycmF5PVwiJHtjaXJjdW1mZXJlbmNlfVwiXG4gICAgICAgICAgc3Ryb2tlLWRhc2hvZmZzZXQ9XCIke2NpcmN1bWZlcmVuY2V9XCJcbiAgICAgICAgICB0cmFuc2Zvcm09XCJyb3RhdGUoLTkwICR7Y3h9ICR7Y3h9KVwiLz5cbiAgICAgIDwvc3ZnPmA7XG5cbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgY2hhcmdlUmluZ0VsID0gZWw7XG5cbiAgICAgIC8vIEFuaW1hdGUgd2l0aCByQUYgZm9yIHNtb290aCBjb250cm9sXG4gICAgICBjb25zdCByaW5nID0gZWwucXVlcnlTZWxlY3RvcihcIi5hZi1yaW5nXCIpIGFzIFNWR0NpcmNsZUVsZW1lbnQgfCBudWxsO1xuICAgICAgaWYgKCFyaW5nKSByZXR1cm47XG4gICAgICBjb25zdCBzdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuXG4gICAgICBjb25zdCB0aWNrID0gKG5vdzogbnVtYmVyKSA9PiB7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gTWF0aC5taW4oKG5vdyAtIHN0YXJ0KSAvIGR1cmF0aW9uLCAxKTtcbiAgICAgICAgLy8gRWFzZS1vdXQgcXVhZCBmb3Igc21vb3RoZXIgZmVlbFxuICAgICAgICBjb25zdCBlYXNlZCA9IDEgLSAoMSAtIHByb2dyZXNzKSAqICgxIC0gcHJvZ3Jlc3MpO1xuICAgICAgICByaW5nLnN0eWxlLnN0cm9rZURhc2hvZmZzZXQgPSBTdHJpbmcoY2lyY3VtZmVyZW5jZSAqICgxIC0gZWFzZWQpKTtcbiAgICAgICAgLy8gRmFkZSBpbiBvcGFjaXR5XG4gICAgICAgIGVsLnN0eWxlLm9wYWNpdHkgPSBTdHJpbmcoMC40ICsgZWFzZWQgKiAwLjUpO1xuICAgICAgICBpZiAocHJvZ3Jlc3MgPCAxKSB7XG4gICAgICAgICAgY2hhcmdlUmluZ0FuaW0gPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGljayk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjaGFyZ2VSaW5nQW5pbSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcbiAgICB9O1xuXG4gICAgY29uc3QgcmVtb3ZlQ2hhcmdlUmluZyA9ICgpID0+IHtcbiAgICAgIGlmIChjaGFyZ2VSaW5nQW5pbSkge1xuICAgICAgICBjYW5jZWxBbmltYXRpb25GcmFtZShjaGFyZ2VSaW5nQW5pbSk7XG4gICAgICAgIGNoYXJnZVJpbmdBbmltID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmIChjaGFyZ2VSaW5nRWwpIHtcbiAgICAgICAgY2hhcmdlUmluZ0VsLnJlbW92ZSgpO1xuICAgICAgICBjaGFyZ2VSaW5nRWwgPSBudWxsO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBjb21wbGV0ZUNoYXJnZVJpbmcgPSAoKSA9PiB7XG4gICAgICBpZiAoY2hhcmdlUmluZ0FuaW0pIHtcbiAgICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUoY2hhcmdlUmluZ0FuaW0pO1xuICAgICAgICBjaGFyZ2VSaW5nQW5pbSA9IG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoY2hhcmdlUmluZ0VsKSB7XG4gICAgICAgIGNoYXJnZVJpbmdFbC5zdHlsZS50cmFuc2l0aW9uID0gXCJvcGFjaXR5IDAuMTVzIGVhc2Utb3V0LCB0cmFuc2Zvcm0gMC4xNXMgZWFzZS1vdXRcIjtcbiAgICAgICAgY2hhcmdlUmluZ0VsLnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcbiAgICAgICAgY2hhcmdlUmluZ0VsLnN0eWxlLnRyYW5zZm9ybSA9IFwic2NhbGUoMS4zKVwiO1xuICAgICAgICBjb25zdCBlbCA9IGNoYXJnZVJpbmdFbDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbC5yZW1vdmUoKSwgMTUwKTtcbiAgICAgICAgY2hhcmdlUmluZ0VsID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gLS0tIE1vdXNlZG93biBoYW5kbGVyIC0tLVxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcIm1vdXNlZG93blwiLFxuICAgICAgKGU6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIE1NQi9DdHJsK2NsaWNrIChuZXcgdGFiIGludGVudClcbiAgICAgICAgY29uc3QgaGFzTW9kaWZpZXIgPVxuICAgICAgICAgIGUuY3RybEtleSB8fFxuICAgICAgICAgIGUubWV0YUtleSB8fFxuICAgICAgICAgIGUuYWx0S2V5IHx8XG4gICAgICAgICAgZS5idXR0b24gPT09IDEgfHxcbiAgICAgICAgICBlLmdldE1vZGlmaWVyU3RhdGUoXCJDb250cm9sXCIpIHx8XG4gICAgICAgICAgZS5nZXRNb2RpZmllclN0YXRlKFwiTWV0YVwiKSB8fFxuICAgICAgICAgIGUuZ2V0TW9kaWZpZXJTdGF0ZShcIkFsdFwiKTtcblxuICAgICAgICBpZiAoaGFzTW9kaWZpZXIpIHtcbiAgICAgICAgICBuZXdUYWJJbnRlbnQgPSB0cnVlO1xuICAgICAgICAgIGJyb3dzZXIuc3RvcmFnZS5sb2NhbFxuICAgICAgICAgICAgLnNldCh7IFtNTUJfS0VZXTogeyB1cmw6IGxvY2F0aW9uLmhyZWYgfSB9KVxuICAgICAgICAgICAgLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgICAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyBhY3Rpb246IFwic2V0TW9kaWZpZXJzXCIsIGN0cmw6IHRydWUgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIENoYXJnZSAvIGxvbmctcHJlc3MgdG8gZnVsbHNjcmVlbiAtLS1cbiAgICAgICAgaWYgKCFpc0VuYWJsZWQpIHJldHVybjtcbiAgICAgICAgaWYgKGUuYnV0dG9uICE9PSAwKSByZXR1cm47XG4gICAgICAgIGlmIChpc0ludGVyYWN0aXZlKGUudGFyZ2V0KSkgeyBsb2coXCJibG9ja2VkOiBpbnRlcmFjdGl2ZSBlbGVtZW50XCIpOyByZXR1cm47IH1cblxuICAgICAgICAvLyBDYW5jZWwgYW55IGV4aXN0aW5nIGNoYXJnZVxuICAgICAgICBpZiAoY2hhcmdlVGltZXIpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQoY2hhcmdlVGltZXIpO1xuICAgICAgICAgIGNoYXJnZVRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNoYXJnZVN0YXJ0WCA9IGUuY2xpZW50WDtcbiAgICAgICAgY2hhcmdlU3RhcnRZID0gZS5jbGllbnRZO1xuICAgICAgICBjaGFyZ2VDb21wbGV0ZWQgPSBmYWxzZTtcblxuICAgICAgICBpZiAobG9uZ1ByZXNzRGVsYXkgPT09IDApIHtcbiAgICAgICAgICAvLyBJbnN0YW50IG1vZGVcbiAgICAgICAgICBjaGFyZ2VDb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgIGJyb3dzZXIucnVudGltZS5zZW5kTWVzc2FnZSh7IGFjdGlvbjogXCJzZXRXaW5kb3dGdWxsc2NyZWVuXCIgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gQ2hhcmdlIG1vZGVcbiAgICAgICAgICBzaG93Q2hhcmdlUmluZyhlLmNsaWVudFgsIGUuY2xpZW50WSwgbG9uZ1ByZXNzRGVsYXkpO1xuICAgICAgICAgIGNoYXJnZVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjaGFyZ2VUaW1lciA9IG51bGw7XG4gICAgICAgICAgICBjaGFyZ2VDb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgY29tcGxldGVDaGFyZ2VSaW5nKCk7XG4gICAgICAgICAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyBhY3Rpb246IFwic2V0V2luZG93RnVsbHNjcmVlblwiIH0pO1xuICAgICAgICAgIH0sIGxvbmdQcmVzc0RlbGF5KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHRydWUsXG4gICAgKTtcblxuICAgIC8vIENhbmNlbCBjaGFyZ2UgaWYgbW91c2UgbW92ZXMgdG9vIGZhclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcIm1vdXNlbW92ZVwiLFxuICAgICAgKGU6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgaWYgKCFjaGFyZ2VUaW1lcikgcmV0dXJuO1xuICAgICAgICBjb25zdCBkeCA9IE1hdGguYWJzKGUuY2xpZW50WCAtIGNoYXJnZVN0YXJ0WCk7XG4gICAgICAgIGNvbnN0IGR5ID0gTWF0aC5hYnMoZS5jbGllbnRZIC0gY2hhcmdlU3RhcnRZKTtcbiAgICAgICAgaWYgKGR4ID4gNTAgfHwgZHkgPiA1MCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dChjaGFyZ2VUaW1lcik7XG4gICAgICAgICAgY2hhcmdlVGltZXIgPSBudWxsO1xuICAgICAgICAgIHJlbW92ZUNoYXJnZVJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHRydWUsXG4gICAgKTtcblxuICAgIC8vIENhbmNlbCBjaGFyZ2UgaWYgbW91c2UgcmVsZWFzZWQgYmVmb3JlIHRpbWVyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwibW91c2V1cFwiLFxuICAgICAgKCkgPT4ge1xuICAgICAgICBpZiAoY2hhcmdlVGltZXIpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQoY2hhcmdlVGltZXIpO1xuICAgICAgICAgIGNoYXJnZVRpbWVyID0gbnVsbDtcbiAgICAgICAgICByZW1vdmVDaGFyZ2VSaW5nKCk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB0cnVlLFxuICAgICk7XG5cbiAgICAvLyBOYXZpZ2F0aW9uIHJlc2V0c1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicG9wc3RhdGVcIiwgKCkgPT4ge1xuICAgICAgbmV3VGFiSW50ZW50ID0gZmFsc2U7XG4gICAgICBicm93c2VyLnN0b3JhZ2UubG9jYWwucmVtb3ZlKE1NQl9LRVkpLmNhdGNoKCgpID0+IHt9KTtcbiAgICB9KTtcbiAgICBjb25zdCBvcmlnUHVzaFN0YXRlID0gaGlzdG9yeS5wdXNoU3RhdGU7XG4gICAgY29uc3Qgb3JpZ1JlcGxhY2VTdGF0ZSA9IGhpc3RvcnkucmVwbGFjZVN0YXRlO1xuICAgIGhpc3RvcnkucHVzaFN0YXRlID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgIG9yaWdQdXNoU3RhdGUuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICBuZXdUYWJJbnRlbnQgPSBmYWxzZTtcbiAgICAgIGJyb3dzZXIuc3RvcmFnZS5sb2NhbC5yZW1vdmUoTU1CX0tFWSkuY2F0Y2goKCkgPT4ge30pO1xuICAgIH07XG4gICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgb3JpZ1JlcGxhY2VTdGF0ZS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIG5ld1RhYkludGVudCA9IGZhbHNlO1xuICAgICAgYnJvd3Nlci5zdG9yYWdlLmxvY2FsLnJlbW92ZShNTUJfS0VZKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCAoKSA9PiB7XG4gICAgICBicm93c2VyLnN0b3JhZ2UubG9jYWwucmVtb3ZlKE1NQl9LRVkpLmNhdGNoKCgpID0+IHt9KTtcbiAgICB9KTtcblxuICAgIC8vIC0tLSBQbGF5IGhhbmRsZXI6IGF1dG8tZnVsbHNjcmVlbiBuZXcgdmlkZW9zIChTUEEgbmF2aWdhdGlvbiBzaWduYWwpIC0tLVxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcInBsYXlcIixcbiAgICAgIChlKSA9PiB7XG4gICAgICAgIGlmICghaXNFbmFibGVkIHx8ICFhdXRvRnVsbHNjcmVlbkVuYWJsZWQpIHJldHVybjtcbiAgICAgICAgaWYgKG5ld1RhYkludGVudCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHZpZGVvID0gZS50YXJnZXQ7XG4gICAgICAgIGlmICghKHZpZGVvIGluc3RhbmNlb2YgSFRNTFZpZGVvRWxlbWVudCkpIHJldHVybjtcbiAgICAgICAgaWYgKHZpZGVvLm9mZnNldFdpZHRoIDwgMjAwIHx8IHZpZGVvLm9mZnNldEhlaWdodCA8IDE1MCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IHNyYyA9IHZpZGVvLmN1cnJlbnRTcmMgfHwgdmlkZW8uc3JjO1xuICAgICAgICBpZiAoIXNyYykgcmV0dXJuO1xuXG4gICAgICAgIGlmIChvbmVXYXlGdWxsc2NyZWVuICYmIGRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSByZXR1cm47XG4gICAgICAgIGlmIChzcmMgPT09IGxhc3RGdWxsc2NyZWVuZWRVcmwpIHJldHVybjtcblxuICAgICAgICBjb25zdCBlbGVtZW50Q2hhbmdlZCA9IHZpZGVvICE9PSBsYXN0RnVsbHNjcmVlbmVkVmlkZW87XG4gICAgICAgIGlmICghZWxlbWVudENoYW5nZWQgJiYgIWF1dG9GdWxsc2NyZWVuT25OZXdWaWRlbykgcmV0dXJuO1xuXG4gICAgICAgIGxhc3RGdWxsc2NyZWVuZWRWaWRlbyA9IHZpZGVvO1xuICAgICAgICBsYXN0RnVsbHNjcmVlbmVkVXJsID0gc3JjO1xuICAgICAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyBhY3Rpb246IFwic2V0V2luZG93RnVsbHNjcmVlblwiIH0pO1xuICAgICAgfSxcbiAgICAgIHRydWUsXG4gICAgKTtcblxuICAgIC8vIC0tLSBBc3luYyBjaGVja3MgLS0tXG5cbiAgICAvLyBDaGVjayBiYWNrZ3JvdW5kIGZvciBtb2RpZmllciBzdGF0ZVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNTsgaSsrKSB7XG4gICAgICBjb25zdCByZXNwID0gYXdhaXQgYnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgYWN0aW9uOiBcImdldE1vZGlmaWVyU3RhdGVcIixcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlc3A/LmN0cmxIZWxkKSB7XG4gICAgICAgIG5ld1RhYkludGVudCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IHNldFRpbWVvdXQociwgMTAwKSk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgcGVyc2lzdGVkIE1NQiBzdGF0ZVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdG9yZWQgPSBhd2FpdCBicm93c2VyLnN0b3JhZ2UubG9jYWwuZ2V0KE1NQl9LRVkpO1xuICAgICAgY29uc3QgZW50cnkgPSBzdG9yZWQ/LltNTUJfS0VZXTtcbiAgICAgIGlmIChlbnRyeT8udXJsID09PSBsb2NhdGlvbi5ocmVmKSB7XG4gICAgICAgIG5ld1RhYkludGVudCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5KSB7XG4gICAgICAgIGJyb3dzZXIuc3RvcmFnZS5sb2NhbC5yZW1vdmUoTU1CX0tFWSkuY2F0Y2goKCkgPT4ge30pO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge31cblxuICAgIC8vIC0tLSBBdXRvLWZ1bGxzY3JlZW4gb24gaW5pdGlhbCBsb2FkIC0tLVxuICAgIGlmIChpc0VuYWJsZWQgJiYgYXV0b0Z1bGxzY3JlZW5FbmFibGVkICYmICFuZXdUYWJJbnRlbnQpIHtcbiAgICAgIGNvbnN0IG1haW5WaWRlbyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJ2aWRlb1wiKTtcbiAgICAgIGlmIChtYWluVmlkZW8pIHtcbiAgICAgICAgbGFzdEZ1bGxzY3JlZW5lZFZpZGVvID0gbWFpblZpZGVvO1xuICAgICAgICBsYXN0RnVsbHNjcmVlbmVkVXJsID0gbWFpblZpZGVvLmN1cnJlbnRTcmMgfHwgbWFpblZpZGVvLnNyYyB8fCBcIlwiO1xuICAgICAgfVxuICAgICAgYnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKHsgYWN0aW9uOiBcInNldFdpbmRvd0Z1bGxzY3JlZW5cIiB9KTtcbiAgICB9XG5cbiAgICAvLyAtLS0gSGlkZSBmdWxsc2NyZWVuIGV4aXQgaW5zdHJ1Y3Rpb25zIC0tLVxuICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xuICAgIHN0eWxlLnRleHRDb250ZW50ID0gYFxuICAgICAgLkNocm9tZS1GdWxsLVNjcmVlbi1FeGl0LUluc3RydWN0aW9uIHsgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OyB9XG4gICAgICAuRnVsbC1TY3JlZW4tRXhpdC1JbnN0cnVjdGlvbiB7IGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgfVxuICAgIGA7XG4gICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cbiAgICAvLyAtLS0gU2V0dGluZ3Mgd2F0Y2hlciAtLS1cbiAgICBsZXQgc2V0dGluZ3NUaW1lb3V0OiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBudWxsO1xuICAgIHN0b3JlLndhdGNoKChuZXdWYWx1ZSkgPT4ge1xuICAgICAgaXNFbmFibGVkID0gbmV3VmFsdWUuZW5hYmxlZDtcbiAgICAgIGF1dG9GdWxsc2NyZWVuRW5hYmxlZCA9IG5ld1ZhbHVlLmF1dG9GdWxsc2NyZWVuRW5hYmxlZDtcbiAgICAgIG9uZVdheUZ1bGxzY3JlZW4gPSBuZXdWYWx1ZS5vbmVXYXlGdWxsc2NyZWVuO1xuICAgICAgYXV0b0Z1bGxzY3JlZW5Pbk5ld1ZpZGVvID0gbmV3VmFsdWUuYXV0b0Z1bGxzY3JlZW5Pbk5ld1ZpZGVvO1xuICAgICAgc3RyaWN0U2FmZXR5ID0gbmV3VmFsdWUuc3RyaWN0U2FmZXR5O1xuICAgICAgbG9uZ1ByZXNzRGVsYXkgPSBuZXdWYWx1ZS5sb25nUHJlc3NEZWxheTtcbiAgICAgIHRvcEVkZ2VFeGl0RW5hYmxlZCA9IG5ld1ZhbHVlLnRvcEVkZ2VFeGl0RW5hYmxlZDtcbiAgICAgIHJpcHBsZUVuYWJsZWQgPSBuZXdWYWx1ZS5yaXBwbGVFbmFibGVkO1xuICAgICAgcHJpbWFyeUNvbG9yID0gbmV3VmFsdWUucHJpbWFyeUNvbG9yIHx8IFwiIzAwRkZGRlwiO1xuICAgICAgaWYgKCFpc0VuYWJsZWQpIHtcbiAgICAgICAgaWYgKHNldHRpbmdzVGltZW91dCkgY2xlYXJUaW1lb3V0KHNldHRpbmdzVGltZW91dCk7XG4gICAgICAgIHNldHRpbmdzVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIGJyb3dzZXIucnVudGltZS5zZW5kTWVzc2FnZSh7IGFjdGlvbjogXCJleGl0V2luZG93RnVsbHNjcmVlblwiIH0pO1xuICAgICAgICB9LCAxMDApO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxufSk7XG4iLCJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5leHBvcnQgY29uc3QgbG9nZ2VyID0ge1xuICBkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuICBsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG4gIHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuICBlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuZXhwb3J0IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gIGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG4gICAgc3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG4gICAgdGhpcy5uZXdVcmwgPSBuZXdVcmw7XG4gICAgdGhpcy5vbGRVcmwgPSBvbGRVcmw7XG4gIH1cbiAgc3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuICByZXR1cm4gYCR7YnJvd3Nlcj8ucnVudGltZT8uaWR9OiR7aW1wb3J0Lm1ldGEuZW52LkVOVFJZUE9JTlR9OiR7ZXZlbnROYW1lfWA7XG59XG4iLCJpbXBvcnQgeyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbldhdGNoZXIoY3R4KSB7XG4gIGxldCBpbnRlcnZhbDtcbiAgbGV0IG9sZFVybDtcbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBFbnN1cmUgdGhlIGxvY2F0aW9uIHdhdGNoZXIgaXMgYWN0aXZlbHkgbG9va2luZyBmb3IgVVJMIGNoYW5nZXMuIElmIGl0J3MgYWxyZWFkeSB3YXRjaGluZyxcbiAgICAgKiB0aGlzIGlzIGEgbm9vcC5cbiAgICAgKi9cbiAgICBydW4oKSB7XG4gICAgICBpZiAoaW50ZXJ2YWwgIT0gbnVsbCkgcmV0dXJuO1xuICAgICAgb2xkVXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgIGludGVydmFsID0gY3R4LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgbGV0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICAgIGlmIChuZXdVcmwuaHJlZiAhPT0gb2xkVXJsLmhyZWYpIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgV3h0TG9jYXRpb25DaGFuZ2VFdmVudChuZXdVcmwsIG9sZFVybCkpO1xuICAgICAgICAgIG9sZFVybCA9IG5ld1VybDtcbiAgICAgICAgfVxuICAgICAgfSwgMWUzKTtcbiAgICB9XG4gIH07XG59XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vLi4vc2FuZGJveC91dGlscy9sb2dnZXIubWpzXCI7XG5pbXBvcnQgeyBnZXRVbmlxdWVFdmVudE5hbWUgfSBmcm9tIFwiLi9jdXN0b20tZXZlbnRzLm1qc1wiO1xuaW1wb3J0IHsgY3JlYXRlTG9jYXRpb25XYXRjaGVyIH0gZnJvbSBcIi4vbG9jYXRpb24td2F0Y2hlci5tanNcIjtcbmV4cG9ydCBjbGFzcyBDb250ZW50U2NyaXB0Q29udGV4dCB7XG4gIGNvbnN0cnVjdG9yKGNvbnRlbnRTY3JpcHROYW1lLCBvcHRpb25zKSB7XG4gICAgdGhpcy5jb250ZW50U2NyaXB0TmFtZSA9IGNvbnRlbnRTY3JpcHROYW1lO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5hYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgaWYgKHRoaXMuaXNUb3BGcmFtZSkge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoeyBpZ25vcmVGaXJzdEV2ZW50OiB0cnVlIH0pO1xuICAgICAgdGhpcy5zdG9wT2xkU2NyaXB0cygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cygpO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFID0gZ2V0VW5pcXVlRXZlbnROYW1lKFxuICAgIFwid3h0OmNvbnRlbnQtc2NyaXB0LXN0YXJ0ZWRcIlxuICApO1xuICBpc1RvcEZyYW1lID0gd2luZG93LnNlbGYgPT09IHdpbmRvdy50b3A7XG4gIGFib3J0Q29udHJvbGxlcjtcbiAgbG9jYXRpb25XYXRjaGVyID0gY3JlYXRlTG9jYXRpb25XYXRjaGVyKHRoaXMpO1xuICByZWNlaXZlZE1lc3NhZ2VJZHMgPSAvKiBAX19QVVJFX18gKi8gbmV3IFNldCgpO1xuICBnZXQgc2lnbmFsKCkge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5zaWduYWw7XG4gIH1cbiAgYWJvcnQocmVhc29uKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLmFib3J0KHJlYXNvbik7XG4gIH1cbiAgZ2V0IGlzSW52YWxpZCgpIHtcbiAgICBpZiAoYnJvd3Nlci5ydW50aW1lLmlkID09IG51bGwpIHtcbiAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc2lnbmFsLmFib3J0ZWQ7XG4gIH1cbiAgZ2V0IGlzVmFsaWQoKSB7XG4gICAgcmV0dXJuICF0aGlzLmlzSW52YWxpZDtcbiAgfVxuICAvKipcbiAgICogQWRkIGEgbGlzdGVuZXIgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgY29udGVudCBzY3JpcHQncyBjb250ZXh0IGlzIGludmFsaWRhdGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHJlbW92ZSB0aGUgbGlzdGVuZXIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoY2IpO1xuICAgKiBjb25zdCByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyID0gY3R4Lm9uSW52YWxpZGF0ZWQoKCkgPT4ge1xuICAgKiAgIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UucmVtb3ZlTGlzdGVuZXIoY2IpO1xuICAgKiB9KVxuICAgKiAvLyAuLi5cbiAgICogcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lcigpO1xuICAgKi9cbiAgb25JbnZhbGlkYXRlZChjYikge1xuICAgIHRoaXMuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBjYik7XG4gICAgcmV0dXJuICgpID0+IHRoaXMuc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBjYik7XG4gIH1cbiAgLyoqXG4gICAqIFJldHVybiBhIHByb21pc2UgdGhhdCBuZXZlciByZXNvbHZlcy4gVXNlZnVsIGlmIHlvdSBoYXZlIGFuIGFzeW5jIGZ1bmN0aW9uIHRoYXQgc2hvdWxkbid0IHJ1blxuICAgKiBhZnRlciB0aGUgY29udGV4dCBpcyBleHBpcmVkLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCBnZXRWYWx1ZUZyb21TdG9yYWdlID0gYXN5bmMgKCkgPT4ge1xuICAgKiAgIGlmIChjdHguaXNJbnZhbGlkKSByZXR1cm4gY3R4LmJsb2NrKCk7XG4gICAqXG4gICAqICAgLy8gLi4uXG4gICAqIH1cbiAgICovXG4gIGJsb2NrKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoKSA9PiB7XG4gICAgfSk7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0SW50ZXJ2YWxgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsIHdoZW4gaW52YWxpZGF0ZWQuXG4gICAqL1xuICBzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0VGltZW91dGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqL1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2tgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqL1xuICByZXF1ZXN0SWRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0SWRsZUNhbGxiYWNrKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuc2lnbmFsLmFib3J0ZWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0sIG9wdGlvbnMpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxJZGxlQ2FsbGJhY2soaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgYWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZSA9PT0gXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIikge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgdGhpcy5sb2NhdGlvbldhdGNoZXIucnVuKCk7XG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4oXG4gICAgICB0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSxcbiAgICAgIGhhbmRsZXIsXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHNpZ25hbDogdGhpcy5zaWduYWxcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQWJvcnQgdGhlIGFib3J0IGNvbnRyb2xsZXIgYW5kIGV4ZWN1dGUgYWxsIGBvbkludmFsaWRhdGVkYCBsaXN0ZW5lcnMuXG4gICAqL1xuICBub3RpZnlJbnZhbGlkYXRlZCgpIHtcbiAgICB0aGlzLmFib3J0KFwiQ29udGVudCBzY3JpcHQgY29udGV4dCBpbnZhbGlkYXRlZFwiKTtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICBgQ29udGVudCBzY3JpcHQgXCIke3RoaXMuY29udGVudFNjcmlwdE5hbWV9XCIgY29udGV4dCBpbnZhbGlkYXRlZGBcbiAgICApO1xuICB9XG4gIHN0b3BPbGRTY3JpcHRzKCkge1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShcbiAgICAgIHtcbiAgICAgICAgdHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuICAgICAgICBjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZSxcbiAgICAgICAgbWVzc2FnZUlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKVxuICAgICAgfSxcbiAgICAgIFwiKlwiXG4gICAgKTtcbiAgfVxuICB2ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpIHtcbiAgICBjb25zdCBpc1NjcmlwdFN0YXJ0ZWRFdmVudCA9IGV2ZW50LmRhdGE/LnR5cGUgPT09IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRTtcbiAgICBjb25zdCBpc1NhbWVDb250ZW50U2NyaXB0ID0gZXZlbnQuZGF0YT8uY29udGVudFNjcmlwdE5hbWUgPT09IHRoaXMuY29udGVudFNjcmlwdE5hbWU7XG4gICAgY29uc3QgaXNOb3REdXBsaWNhdGUgPSAhdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuaGFzKGV2ZW50LmRhdGE/Lm1lc3NhZ2VJZCk7XG4gICAgcmV0dXJuIGlzU2NyaXB0U3RhcnRlZEV2ZW50ICYmIGlzU2FtZUNvbnRlbnRTY3JpcHQgJiYgaXNOb3REdXBsaWNhdGU7XG4gIH1cbiAgbGlzdGVuRm9yTmV3ZXJTY3JpcHRzKG9wdGlvbnMpIHtcbiAgICBsZXQgaXNGaXJzdCA9IHRydWU7XG4gICAgY29uc3QgY2IgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICh0aGlzLnZlcmlmeVNjcmlwdFN0YXJ0ZWRFdmVudChldmVudCkpIHtcbiAgICAgICAgdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuYWRkKGV2ZW50LmRhdGEubWVzc2FnZUlkKTtcbiAgICAgICAgY29uc3Qgd2FzRmlyc3QgPSBpc0ZpcnN0O1xuICAgICAgICBpc0ZpcnN0ID0gZmFsc2U7XG4gICAgICAgIGlmICh3YXNGaXJzdCAmJiBvcHRpb25zPy5pZ25vcmVGaXJzdEV2ZW50KSByZXR1cm47XG4gICAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gcmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpKTtcbiAgfVxufVxuIiwiY29uc3QgbnVsbEtleSA9IFN5bWJvbCgnbnVsbCcpOyAvLyBgb2JqZWN0SGFzaGVzYCBrZXkgZm9yIG51bGxcblxubGV0IGtleUNvdW50ZXIgPSAwO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNYW55S2V5c01hcCBleHRlbmRzIE1hcCB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLl9vYmplY3RIYXNoZXMgPSBuZXcgV2Vha01hcCgpO1xuXHRcdHRoaXMuX3N5bWJvbEhhc2hlcyA9IG5ldyBNYXAoKTsgLy8gaHR0cHM6Ly9naXRodWIuY29tL3RjMzkvZWNtYTI2Mi9pc3N1ZXMvMTE5NFxuXHRcdHRoaXMuX3B1YmxpY0tleXMgPSBuZXcgTWFwKCk7XG5cblx0XHRjb25zdCBbcGFpcnNdID0gYXJndW1lbnRzOyAvLyBNYXAgY29tcGF0XG5cdFx0aWYgKHBhaXJzID09PSBudWxsIHx8IHBhaXJzID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHBhaXJzW1N5bWJvbC5pdGVyYXRvcl0gIT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IodHlwZW9mIHBhaXJzICsgJyBpcyBub3QgaXRlcmFibGUgKGNhbm5vdCByZWFkIHByb3BlcnR5IFN5bWJvbChTeW1ib2wuaXRlcmF0b3IpKScpO1xuXHRcdH1cblxuXHRcdGZvciAoY29uc3QgW2tleXMsIHZhbHVlXSBvZiBwYWlycykge1xuXHRcdFx0dGhpcy5zZXQoa2V5cywgdmFsdWUpO1xuXHRcdH1cblx0fVxuXG5cdF9nZXRQdWJsaWNLZXlzKGtleXMsIGNyZWF0ZSA9IGZhbHNlKSB7XG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KGtleXMpKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUga2V5cyBwYXJhbWV0ZXIgbXVzdCBiZSBhbiBhcnJheScpO1xuXHRcdH1cblxuXHRcdGNvbnN0IHByaXZhdGVLZXkgPSB0aGlzLl9nZXRQcml2YXRlS2V5KGtleXMsIGNyZWF0ZSk7XG5cblx0XHRsZXQgcHVibGljS2V5O1xuXHRcdGlmIChwcml2YXRlS2V5ICYmIHRoaXMuX3B1YmxpY0tleXMuaGFzKHByaXZhdGVLZXkpKSB7XG5cdFx0XHRwdWJsaWNLZXkgPSB0aGlzLl9wdWJsaWNLZXlzLmdldChwcml2YXRlS2V5KTtcblx0XHR9IGVsc2UgaWYgKGNyZWF0ZSkge1xuXHRcdFx0cHVibGljS2V5ID0gWy4uLmtleXNdOyAvLyBSZWdlbmVyYXRlIGtleXMgYXJyYXkgdG8gYXZvaWQgZXh0ZXJuYWwgaW50ZXJhY3Rpb25cblx0XHRcdHRoaXMuX3B1YmxpY0tleXMuc2V0KHByaXZhdGVLZXksIHB1YmxpY0tleSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHtwcml2YXRlS2V5LCBwdWJsaWNLZXl9O1xuXHR9XG5cblx0X2dldFByaXZhdGVLZXkoa2V5cywgY3JlYXRlID0gZmFsc2UpIHtcblx0XHRjb25zdCBwcml2YXRlS2V5cyA9IFtdO1xuXHRcdGZvciAobGV0IGtleSBvZiBrZXlzKSB7XG5cdFx0XHRpZiAoa2V5ID09PSBudWxsKSB7XG5cdFx0XHRcdGtleSA9IG51bGxLZXk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGhhc2hlcyA9IHR5cGVvZiBrZXkgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBrZXkgPT09ICdmdW5jdGlvbicgPyAnX29iamVjdEhhc2hlcycgOiAodHlwZW9mIGtleSA9PT0gJ3N5bWJvbCcgPyAnX3N5bWJvbEhhc2hlcycgOiBmYWxzZSk7XG5cblx0XHRcdGlmICghaGFzaGVzKSB7XG5cdFx0XHRcdHByaXZhdGVLZXlzLnB1c2goa2V5KTtcblx0XHRcdH0gZWxzZSBpZiAodGhpc1toYXNoZXNdLmhhcyhrZXkpKSB7XG5cdFx0XHRcdHByaXZhdGVLZXlzLnB1c2godGhpc1toYXNoZXNdLmdldChrZXkpKTtcblx0XHRcdH0gZWxzZSBpZiAoY3JlYXRlKSB7XG5cdFx0XHRcdGNvbnN0IHByaXZhdGVLZXkgPSBgQEBta20tcmVmLSR7a2V5Q291bnRlcisrfUBAYDtcblx0XHRcdFx0dGhpc1toYXNoZXNdLnNldChrZXksIHByaXZhdGVLZXkpO1xuXHRcdFx0XHRwcml2YXRlS2V5cy5wdXNoKHByaXZhdGVLZXkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShwcml2YXRlS2V5cyk7XG5cdH1cblxuXHRzZXQoa2V5cywgdmFsdWUpIHtcblx0XHRjb25zdCB7cHVibGljS2V5fSA9IHRoaXMuX2dldFB1YmxpY0tleXMoa2V5cywgdHJ1ZSk7XG5cdFx0cmV0dXJuIHN1cGVyLnNldChwdWJsaWNLZXksIHZhbHVlKTtcblx0fVxuXG5cdGdldChrZXlzKSB7XG5cdFx0Y29uc3Qge3B1YmxpY0tleX0gPSB0aGlzLl9nZXRQdWJsaWNLZXlzKGtleXMpO1xuXHRcdHJldHVybiBzdXBlci5nZXQocHVibGljS2V5KTtcblx0fVxuXG5cdGhhcyhrZXlzKSB7XG5cdFx0Y29uc3Qge3B1YmxpY0tleX0gPSB0aGlzLl9nZXRQdWJsaWNLZXlzKGtleXMpO1xuXHRcdHJldHVybiBzdXBlci5oYXMocHVibGljS2V5KTtcblx0fVxuXG5cdGRlbGV0ZShrZXlzKSB7XG5cdFx0Y29uc3Qge3B1YmxpY0tleSwgcHJpdmF0ZUtleX0gPSB0aGlzLl9nZXRQdWJsaWNLZXlzKGtleXMpO1xuXHRcdHJldHVybiBCb29sZWFuKHB1YmxpY0tleSAmJiBzdXBlci5kZWxldGUocHVibGljS2V5KSAmJiB0aGlzLl9wdWJsaWNLZXlzLmRlbGV0ZShwcml2YXRlS2V5KSk7XG5cdH1cblxuXHRjbGVhcigpIHtcblx0XHRzdXBlci5jbGVhcigpO1xuXHRcdHRoaXMuX3N5bWJvbEhhc2hlcy5jbGVhcigpO1xuXHRcdHRoaXMuX3B1YmxpY0tleXMuY2xlYXIoKTtcblx0fVxuXG5cdGdldCBbU3ltYm9sLnRvU3RyaW5nVGFnXSgpIHtcblx0XHRyZXR1cm4gJ01hbnlLZXlzTWFwJztcblx0fVxuXG5cdGdldCBzaXplKCkge1xuXHRcdHJldHVybiBzdXBlci5zaXplO1xuXHR9XG59XG4iLCJpbXBvcnQgTWFueUtleXNNYXAgZnJvbSAnbWFueS1rZXlzLW1hcCc7XG5pbXBvcnQgeyBkZWZ1IH0gZnJvbSAnZGVmdSc7XG5pbXBvcnQgeyBpc0V4aXN0IH0gZnJvbSAnLi9kZXRlY3RvcnMubWpzJztcblxuY29uc3QgZ2V0RGVmYXVsdE9wdGlvbnMgPSAoKSA9PiAoe1xuICB0YXJnZXQ6IGdsb2JhbFRoaXMuZG9jdW1lbnQsXG4gIHVuaWZ5UHJvY2VzczogdHJ1ZSxcbiAgZGV0ZWN0b3I6IGlzRXhpc3QsXG4gIG9ic2VydmVDb25maWdzOiB7XG4gICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgIHN1YnRyZWU6IHRydWUsXG4gICAgYXR0cmlidXRlczogdHJ1ZVxuICB9LFxuICBzaWduYWw6IHZvaWQgMCxcbiAgY3VzdG9tTWF0Y2hlcjogdm9pZCAwXG59KTtcbmNvbnN0IG1lcmdlT3B0aW9ucyA9ICh1c2VyU2lkZU9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKSA9PiB7XG4gIHJldHVybiBkZWZ1KHVzZXJTaWRlT3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xufTtcblxuY29uc3QgdW5pZnlDYWNoZSA9IG5ldyBNYW55S2V5c01hcCgpO1xuZnVuY3Rpb24gY3JlYXRlV2FpdEVsZW1lbnQoaW5zdGFuY2VPcHRpb25zKSB7XG4gIGNvbnN0IHsgZGVmYXVsdE9wdGlvbnMgfSA9IGluc3RhbmNlT3B0aW9ucztcbiAgcmV0dXJuIChzZWxlY3Rvciwgb3B0aW9ucykgPT4ge1xuICAgIGNvbnN0IHtcbiAgICAgIHRhcmdldCxcbiAgICAgIHVuaWZ5UHJvY2VzcyxcbiAgICAgIG9ic2VydmVDb25maWdzLFxuICAgICAgZGV0ZWN0b3IsXG4gICAgICBzaWduYWwsXG4gICAgICBjdXN0b21NYXRjaGVyXG4gICAgfSA9IG1lcmdlT3B0aW9ucyhvcHRpb25zLCBkZWZhdWx0T3B0aW9ucyk7XG4gICAgY29uc3QgdW5pZnlQcm9taXNlS2V5ID0gW1xuICAgICAgc2VsZWN0b3IsXG4gICAgICB0YXJnZXQsXG4gICAgICB1bmlmeVByb2Nlc3MsXG4gICAgICBvYnNlcnZlQ29uZmlncyxcbiAgICAgIGRldGVjdG9yLFxuICAgICAgc2lnbmFsLFxuICAgICAgY3VzdG9tTWF0Y2hlclxuICAgIF07XG4gICAgY29uc3QgY2FjaGVkUHJvbWlzZSA9IHVuaWZ5Q2FjaGUuZ2V0KHVuaWZ5UHJvbWlzZUtleSk7XG4gICAgaWYgKHVuaWZ5UHJvY2VzcyAmJiBjYWNoZWRQcm9taXNlKSB7XG4gICAgICByZXR1cm4gY2FjaGVkUHJvbWlzZTtcbiAgICB9XG4gICAgY29uc3QgZGV0ZWN0UHJvbWlzZSA9IG5ldyBQcm9taXNlKFxuICAgICAgLy8gYmlvbWUtaWdub3JlIGxpbnQvc3VzcGljaW91cy9ub0FzeW5jUHJvbWlzZUV4ZWN1dG9yOiBhdm9pZCBuZXN0aW5nIHByb21pc2VcbiAgICAgIGFzeW5jIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgaWYgKHNpZ25hbD8uYWJvcnRlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3Qoc2lnbmFsLnJlYXNvbik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihcbiAgICAgICAgICBhc3luYyAobXV0YXRpb25zKSA9PiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IF8gb2YgbXV0YXRpb25zKSB7XG4gICAgICAgICAgICAgIGlmIChzaWduYWw/LmFib3J0ZWQpIHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc3QgZGV0ZWN0UmVzdWx0MiA9IGF3YWl0IGRldGVjdEVsZW1lbnQoe1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yLFxuICAgICAgICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICAgICAgICBkZXRlY3RvcixcbiAgICAgICAgICAgICAgICBjdXN0b21NYXRjaGVyXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBpZiAoZGV0ZWN0UmVzdWx0Mi5pc0RldGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZGV0ZWN0UmVzdWx0Mi5yZXN1bHQpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBzaWduYWw/LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgICAgXCJhYm9ydFwiLFxuICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIG9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgIHJldHVybiByZWplY3Qoc2lnbmFsLnJlYXNvbik7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB7IG9uY2U6IHRydWUgfVxuICAgICAgICApO1xuICAgICAgICBjb25zdCBkZXRlY3RSZXN1bHQgPSBhd2FpdCBkZXRlY3RFbGVtZW50KHtcbiAgICAgICAgICBzZWxlY3RvcixcbiAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgZGV0ZWN0b3IsXG4gICAgICAgICAgY3VzdG9tTWF0Y2hlclxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGRldGVjdFJlc3VsdC5pc0RldGVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmUoZGV0ZWN0UmVzdWx0LnJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZSh0YXJnZXQsIG9ic2VydmVDb25maWdzKTtcbiAgICAgIH1cbiAgICApLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgdW5pZnlDYWNoZS5kZWxldGUodW5pZnlQcm9taXNlS2V5KTtcbiAgICB9KTtcbiAgICB1bmlmeUNhY2hlLnNldCh1bmlmeVByb21pc2VLZXksIGRldGVjdFByb21pc2UpO1xuICAgIHJldHVybiBkZXRlY3RQcm9taXNlO1xuICB9O1xufVxuYXN5bmMgZnVuY3Rpb24gZGV0ZWN0RWxlbWVudCh7XG4gIHRhcmdldCxcbiAgc2VsZWN0b3IsXG4gIGRldGVjdG9yLFxuICBjdXN0b21NYXRjaGVyXG59KSB7XG4gIGNvbnN0IGVsZW1lbnQgPSBjdXN0b21NYXRjaGVyID8gY3VzdG9tTWF0Y2hlcihzZWxlY3RvcikgOiB0YXJnZXQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIHJldHVybiBhd2FpdCBkZXRlY3RvcihlbGVtZW50KTtcbn1cbmNvbnN0IHdhaXRFbGVtZW50ID0gY3JlYXRlV2FpdEVsZW1lbnQoe1xuICBkZWZhdWx0T3B0aW9uczogZ2V0RGVmYXVsdE9wdGlvbnMoKVxufSk7XG5cbmV4cG9ydCB7IGNyZWF0ZVdhaXRFbGVtZW50LCBnZXREZWZhdWx0T3B0aW9ucywgd2FpdEVsZW1lbnQgfTtcbiJdLCJuYW1lcyI6WyJicm93c2VyIiwicmVzdWx0Iiwia2V5cyIsIl9hIiwib3B0cyIsIm1hcCIsImRlZmluaXRpb24iLCJwcmludCIsImxvZ2dlciIsIl9iIiwiX2MiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFPLFFBQU1BO0FBQUFBO0FBQUFBLE1BRVgsc0JBQVcsWUFBWCxtQkFBb0IsWUFBcEIsbUJBQTZCLE9BQU0sT0FBTyxXQUFXO0FBQUE7QUFBQSxNQUVuRCxXQUFXO0FBQUE7QUFBQTtBQ0hSLFFBQU0sWUFBVSxzQkFBVyxZQUFYLG1CQUFvQixZQUFwQixtQkFBNkIsTUFDaEQsV0FBVyxVQUNYLFdBQVc7QUNEZixRQUFNLGFBQWEsSUFBSSxNQUFNLDJCQUEyQjtBQUV4RCxNQUFJLGNBQW9ELFNBQVUsU0FBUyxZQUFZLEdBQUcsV0FBVztBQUNqRyxhQUFTLE1BQU0sT0FBTztBQUFFLGFBQU8saUJBQWlCLElBQUksUUFBUSxJQUFJLEVBQUUsU0FBVSxTQUFTO0FBQUUsZ0JBQVEsS0FBSztBQUFBLE1BQUcsQ0FBQztBQUFBLElBQUc7QUFDM0csV0FBTyxLQUFLLE1BQU0sSUFBSSxVQUFVLFNBQVUsU0FBUyxRQUFRO0FBQ3ZELGVBQVMsVUFBVSxPQUFPO0FBQUUsWUFBSTtBQUFFLGVBQUssVUFBVSxLQUFLLEtBQUssQ0FBQztBQUFBLFFBQUcsU0FBUyxHQUFHO0FBQUUsaUJBQU8sQ0FBQztBQUFBLFFBQUc7QUFBQSxNQUFFO0FBQzFGLGVBQVMsU0FBUyxPQUFPO0FBQUUsWUFBSTtBQUFFLGVBQUssVUFBVSxPQUFPLEVBQUUsS0FBSyxDQUFDO0FBQUEsUUFBRyxTQUFTLEdBQUc7QUFBRSxpQkFBTyxDQUFDO0FBQUEsUUFBRztBQUFBLE1BQUU7QUFDN0YsZUFBUyxLQUFLQyxTQUFRO0FBQUUsUUFBQUEsUUFBTyxPQUFPLFFBQVFBLFFBQU8sS0FBSyxJQUFJLE1B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TSxJQUFJO0FBQ2xELGFBQU8sTUFBTSxJQUFJLFdBQVcsS0FBSztBQUFBLElBQ2xDO0FBQUEsSUFFQSxJQUFJLE1BQU07QUFDVCxZQUFNLEVBQUMsVUFBUyxJQUFJLEtBQUssZUFBZSxJQUFJO0FBQzVDLGFBQU8sTUFBTSxJQUFJLFNBQVM7QUFBQSxJQUMzQjtBQUFBLElBRUEsSUFBSSxNQUFNO0FBQ1QsWUFBTSxFQUFDLFVBQVMsSUFBSSxLQUFLLGVBQWUsSUFBSTtBQUM1QyxhQUFPLE1BQU0sSUFBSSxTQUFTO0FBQUEsSUFDM0I7QUFBQSxJQUVBLE9BQU8sTUFBTTtBQUNaLFlBQU0sRUFBQyxXQUFXLFdBQVUsSUFBSSxLQUFLLGVBQWUsSUFBSTtBQUN4RCxhQUFPLFFBQVEsYUFBYSxNQUFNLE9BQU8sU0FBUyxLQUFLLEtBQUssWUFBWSxPQUFPLFVBQVUsQ0FBQztBQUFBLElBQzNGO0FBQUEsSUFFQSxRQUFRO0FBQ1AsWUFBTSxNQUFLO0FBQ1gsV0FBSyxjQUFjLE1BQUs7QUFDeEIsV0FBSyxZQUFZLE1BQUs7QUFBQSxJQUN2QjtBQUFBLElBRUEsS0FBSyxPQUFPLFdBQVcsSUFBSTtBQUMxQixhQUFPO0FBQUEsSUFDUjtBQUFBLElBRUEsSUFBSSxPQUFPO0FBQ1YsYUFBTyxNQUFNO0FBQUEsSUFDZDtBQUFBLEVBQ0Q7QUNsRm1CLE1BQUksWUFBVzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDEsMiwzLDQsNiw4LDksMTAsMTEsMTIsMTNdfQ==
