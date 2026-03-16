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
    fullscreenVideo: false
  };
  const store = storage.defineItem("sync:store", {
    fallback: defaultStore
  });
  content;
  function defineContentScript(definition2) {
    return definition2;
  }
  const MODIFIER_KEY = "af_modifier";
  const MODIFIER_TTL = 15e3;
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    async main() {
      const s = await store.getValue();
      let isEnabled = s.enabled;
      let autoFullscreenEnabled = s.autoFullscreenEnabled;
      s.oneWayFullscreen;
      let autoFullscreenOnNewVideo = s.autoFullscreenOnNewVideo;
      let strictSafety = s.strictSafety;
      let longPressDelay = s.longPressDelay;
      let topEdgeExitEnabled = s.topEdgeExitEnabled;
      let rippleEnabled = s.rippleEnabled;
      let primaryColor = s.primaryColor || "#00FFFF";
      let fullscreenVideo = s.fullscreenVideo;
      let newTabIntent = false;
      let lastFullscreenedVideo = null;
      const MMB_KEY = "af_mmb_intent";
      const findMainVideo = () => {
        const videos = document.querySelectorAll("video");
        let best = null;
        let bestArea = 0;
        for (const v of videos) {
          const area = v.offsetWidth * v.offsetHeight;
          if (area > bestArea && v.offsetWidth >= 200 && v.offsetHeight >= 150) {
            best = v;
            bestArea = area;
          }
        }
        return best;
      };
      const doFullscreen = (hasGesture = false) => {
        if (fullscreenVideo && hasGesture) {
          const video = findMainVideo();
          if (video && !document.fullscreenElement) {
            video.requestFullscreen().catch(() => {
              browser$1.runtime.sendMessage({ action: "setWindowFullscreen" });
            });
            return;
          }
        }
        browser$1.runtime.sendMessage({ action: "setWindowFullscreen" });
      };
      const saveModifierState = (active) => {
        {
          browser$1.storage.local.set({ [MODIFIER_KEY]: { ts: Date.now() } }).catch(() => {
          });
        }
      };
      document.addEventListener(
        "keydown",
        (e) => {
          if (e.getModifierState("Control") || e.getModifierState("Meta") || e.getModifierState("Alt")) {
            newTabIntent = true;
            saveModifierState();
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
      const TOP_EDGE_THRESHOLD = 20;
      document.addEventListener(
        "mousemove",
        (e) => {
          if (!topEdgeExitEnabled || !isEnabled) return;
          if (e.clientY <= TOP_EDGE_THRESHOLD) {
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
        el.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;pointer-events:none;z-index:2147483647;`;
        el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="${CHARGE_RING_STROKE}"/><circle class="af-ring" cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${primaryColor}" stroke-width="${CHARGE_RING_STROKE}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" transform="rotate(-90 ${cx} ${cx})"/></svg>`;
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
          if (progress < 1) chargeRingAnim = requestAnimationFrame(tick);
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
            saveModifierState();
            browser$1.storage.local.set({ [MMB_KEY]: { url: location.href } }).catch(() => {
            });
            browser$1.runtime.sendMessage({ action: "setModifiers", ctrl: true });
            return;
          }
          if (!isEnabled || e.button !== 0 || isInteractive(e.target)) return;
          if (chargeTimer) {
            clearTimeout(chargeTimer);
            chargeTimer = null;
          }
          chargeStartX = e.clientX;
          chargeStartY = e.clientY;
          if (longPressDelay === 0) {
            doFullscreen(true);
          } else {
            showChargeRing(e.clientX, e.clientY, longPressDelay);
            chargeTimer = setTimeout(() => {
              chargeTimer = null;
              completeChargeRing();
              doFullscreen();
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
      let lastKnownUrl = location.href;
      const checkUrlChange = () => {
        const currentUrl = location.href;
        if (currentUrl !== lastKnownUrl) {
          lastKnownUrl = currentUrl;
          if (isEnabled && autoFullscreenEnabled && autoFullscreenOnNewVideo && !newTabIntent) {
            lastFullscreenedVideo = findMainVideo();
            (lastFullscreenedVideo == null ? void 0 : lastFullscreenedVideo.currentSrc) || (lastFullscreenedVideo == null ? void 0 : lastFullscreenedVideo.src) || "";
            doFullscreen();
          }
        }
        newTabIntent = false;
        browser$1.storage.local.remove(MMB_KEY).catch(() => {
        });
      };
      const origPushState = history.pushState;
      const origReplaceState = history.replaceState;
      history.pushState = function(...args) {
        origPushState.apply(this, args);
        checkUrlChange();
      };
      history.replaceState = function(...args) {
        origReplaceState.apply(this, args);
        checkUrlChange();
      };
      window.addEventListener("popstate", checkUrlChange);
      window.addEventListener("beforeunload", () => {
        browser$1.storage.local.remove(MMB_KEY).catch(() => {
        });
      });
      let urlPollInterval = null;
      const startUrlPoll = () => {
        if (urlPollInterval) return;
        urlPollInterval = setInterval(checkUrlChange, 1e3);
      };
      const stopUrlPoll = () => {
        if (urlPollInterval) {
          clearInterval(urlPollInterval);
          urlPollInterval = null;
        }
      };
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopUrlPoll();
        else startUrlPoll();
      });
      startUrlPoll();
      for (let i = 0; i < 5; i++) {
        const resp = await browser$1.runtime.sendMessage({ action: "getModifierState" });
        if (resp == null ? void 0 : resp.ctrlHeld) {
          newTabIntent = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      try {
        const modStored = await browser$1.storage.local.get(MODIFIER_KEY);
        const modEntry = modStored == null ? void 0 : modStored[MODIFIER_KEY];
        if ((modEntry == null ? void 0 : modEntry.ts) && Date.now() - modEntry.ts < MODIFIER_TTL) {
          newTabIntent = true;
        } else if (modEntry) {
          browser$1.storage.local.remove(MODIFIER_KEY).catch(() => {
          });
        }
      } catch {
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
        const mainVideo = findMainVideo();
        if (mainVideo) {
          lastFullscreenedVideo = mainVideo;
          mainVideo.currentSrc || mainVideo.src || "";
        }
        lastKnownUrl = location.href;
        doFullscreen();
      }
      const style = document.createElement("style");
      style.textContent = `.Chrome-Full-Screen-Exit-Instruction{display:none!important}.Full-Screen-Exit-Instruction{display:none!important}`;
      document.head.appendChild(style);
      let settingsTimeout = null;
      store.watch((newValue) => {
        isEnabled = newValue.enabled;
        autoFullscreenEnabled = newValue.autoFullscreenEnabled;
        newValue.oneWayFullscreen;
        autoFullscreenOnNewVideo = newValue.autoFullscreenOnNewVideo;
        strictSafety = newValue.strictSafety;
        longPressDelay = newValue.longPressDelay;
        topEdgeExitEnabled = newValue.topEdgeExitEnabled;
        rippleEnabled = newValue.rippleEnabled;
        primaryColor = newValue.primaryColor || "#00FFFF";
        fullscreenVideo = newValue.fullscreenVideo;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIvY2hyb21lLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvYXN5bmMtbXV0ZXgvaW5kZXgubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2RlcXVhbC9saXRlL2luZGV4Lm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9zdG9yYWdlL2Rpc3QvaW5kZXgubWpzIiwiLi4vLi4vLi4vdXRpbHMvc3RvcmUudHMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3Qvc2FuZGJveC9kZWZpbmUtY29udGVudC1zY3JpcHQubWpzIiwiLi4vLi4vLi4vZW50cnlwb2ludHMvY29udGVudC50cyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9zYW5kYm94L3V0aWxzL2xvZ2dlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvY2xpZW50L2NvbnRlbnQtc2NyaXB0cy9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9jbGllbnQvY29udGVudC1zY3JpcHRzL2xvY2F0aW9uLXdhdGNoZXIubWpzIiwiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2NsaWVudC9jb250ZW50LXNjcmlwdHMvY29udGVudC1zY3JpcHQtY29udGV4dC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvbWFueS1rZXlzLW1hcC9pbmRleC5qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AMW5hdHN1L3dhaXQtZWxlbWVudC9kaXN0L2luZGV4Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgYnJvd3NlciA9IChcbiAgLy8gQHRzLWV4cGVjdC1lcnJvclxuICBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkID09IG51bGwgPyBnbG9iYWxUaGlzLmNocm9tZSA6IChcbiAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgZ2xvYmFsVGhpcy5icm93c2VyXG4gIClcbik7XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJjb25zdCBFX1RJTUVPVVQgPSBuZXcgRXJyb3IoJ3RpbWVvdXQgd2hpbGUgd2FpdGluZyBmb3IgbXV0ZXggdG8gYmVjb21lIGF2YWlsYWJsZScpO1xuY29uc3QgRV9BTFJFQURZX0xPQ0tFRCA9IG5ldyBFcnJvcignbXV0ZXggYWxyZWFkeSBsb2NrZWQnKTtcbmNvbnN0IEVfQ0FOQ0VMRUQgPSBuZXcgRXJyb3IoJ3JlcXVlc3QgZm9yIGxvY2sgY2FuY2VsZWQnKTtcblxudmFyIF9fYXdhaXRlciQyID0gKHVuZGVmaW5lZCAmJiB1bmRlZmluZWQuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5jbGFzcyBTZW1hcGhvcmUge1xuICAgIGNvbnN0cnVjdG9yKF92YWx1ZSwgX2NhbmNlbEVycm9yID0gRV9DQU5DRUxFRCkge1xuICAgICAgICB0aGlzLl92YWx1ZSA9IF92YWx1ZTtcbiAgICAgICAgdGhpcy5fY2FuY2VsRXJyb3IgPSBfY2FuY2VsRXJyb3I7XG4gICAgICAgIHRoaXMuX3F1ZXVlID0gW107XG4gICAgICAgIHRoaXMuX3dlaWdodGVkV2FpdGVycyA9IFtdO1xuICAgIH1cbiAgICBhY3F1aXJlKHdlaWdodCA9IDEsIHByaW9yaXR5ID0gMCkge1xuICAgICAgICBpZiAod2VpZ2h0IDw9IDApXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgd2VpZ2h0ICR7d2VpZ2h0fTogbXVzdCBiZSBwb3NpdGl2ZWApO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGFzayA9IHsgcmVzb2x2ZSwgcmVqZWN0LCB3ZWlnaHQsIHByaW9yaXR5IH07XG4gICAgICAgICAgICBjb25zdCBpID0gZmluZEluZGV4RnJvbUVuZCh0aGlzLl9xdWV1ZSwgKG90aGVyKSA9PiBwcmlvcml0eSA8PSBvdGhlci5wcmlvcml0eSk7XG4gICAgICAgICAgICBpZiAoaSA9PT0gLTEgJiYgd2VpZ2h0IDw9IHRoaXMuX3ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gTmVlZHMgaW1tZWRpYXRlIGRpc3BhdGNoLCBza2lwIHRoZSBxdWV1ZVxuICAgICAgICAgICAgICAgIHRoaXMuX2Rpc3BhdGNoSXRlbSh0YXNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX3F1ZXVlLnNwbGljZShpICsgMSwgMCwgdGFzayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBydW5FeGNsdXNpdmUoY2FsbGJhY2tfMSkge1xuICAgICAgICByZXR1cm4gX19hd2FpdGVyJDIodGhpcywgYXJndW1lbnRzLCB2b2lkIDAsIGZ1bmN0aW9uKiAoY2FsbGJhY2ssIHdlaWdodCA9IDEsIHByaW9yaXR5ID0gMCkge1xuICAgICAgICAgICAgY29uc3QgW3ZhbHVlLCByZWxlYXNlXSA9IHlpZWxkIHRoaXMuYWNxdWlyZSh3ZWlnaHQsIHByaW9yaXR5KTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHlpZWxkIGNhbGxiYWNrKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHdhaXRGb3JVbmxvY2sod2VpZ2h0ID0gMSwgcHJpb3JpdHkgPSAwKSB7XG4gICAgICAgIGlmICh3ZWlnaHQgPD0gMClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgIGlmICh0aGlzLl9jb3VsZExvY2tJbW1lZGlhdGVseSh3ZWlnaHQsIHByaW9yaXR5KSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV0pXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXSA9IFtdO1xuICAgICAgICAgICAgICAgIGluc2VydFNvcnRlZCh0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV0sIHsgcmVzb2x2ZSwgcHJpb3JpdHkgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpc0xvY2tlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3ZhbHVlIDw9IDA7XG4gICAgfVxuICAgIGdldFZhbHVlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG4gICAgfVxuICAgIHNldFZhbHVlKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgIHRoaXMuX2Rpc3BhdGNoUXVldWUoKTtcbiAgICB9XG4gICAgcmVsZWFzZSh3ZWlnaHQgPSAxKSB7XG4gICAgICAgIGlmICh3ZWlnaHQgPD0gMClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgIHRoaXMuX3ZhbHVlICs9IHdlaWdodDtcbiAgICAgICAgdGhpcy5fZGlzcGF0Y2hRdWV1ZSgpO1xuICAgIH1cbiAgICBjYW5jZWwoKSB7XG4gICAgICAgIHRoaXMuX3F1ZXVlLmZvckVhY2goKGVudHJ5KSA9PiBlbnRyeS5yZWplY3QodGhpcy5fY2FuY2VsRXJyb3IpKTtcbiAgICAgICAgdGhpcy5fcXVldWUgPSBbXTtcbiAgICB9XG4gICAgX2Rpc3BhdGNoUXVldWUoKSB7XG4gICAgICAgIHRoaXMuX2RyYWluVW5sb2NrV2FpdGVycygpO1xuICAgICAgICB3aGlsZSAodGhpcy5fcXVldWUubGVuZ3RoID4gMCAmJiB0aGlzLl9xdWV1ZVswXS53ZWlnaHQgPD0gdGhpcy5fdmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2Rpc3BhdGNoSXRlbSh0aGlzLl9xdWV1ZS5zaGlmdCgpKTtcbiAgICAgICAgICAgIHRoaXMuX2RyYWluVW5sb2NrV2FpdGVycygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIF9kaXNwYXRjaEl0ZW0oaXRlbSkge1xuICAgICAgICBjb25zdCBwcmV2aW91c1ZhbHVlID0gdGhpcy5fdmFsdWU7XG4gICAgICAgIHRoaXMuX3ZhbHVlIC09IGl0ZW0ud2VpZ2h0O1xuICAgICAgICBpdGVtLnJlc29sdmUoW3ByZXZpb3VzVmFsdWUsIHRoaXMuX25ld1JlbGVhc2VyKGl0ZW0ud2VpZ2h0KV0pO1xuICAgIH1cbiAgICBfbmV3UmVsZWFzZXIod2VpZ2h0KSB7XG4gICAgICAgIGxldCBjYWxsZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjYWxsZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMucmVsZWFzZSh3ZWlnaHQpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBfZHJhaW5VbmxvY2tXYWl0ZXJzKCkge1xuICAgICAgICBpZiAodGhpcy5fcXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB3ZWlnaHQgPSB0aGlzLl92YWx1ZTsgd2VpZ2h0ID4gMDsgd2VpZ2h0LS0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCB3YWl0ZXJzID0gdGhpcy5fd2VpZ2h0ZWRXYWl0ZXJzW3dlaWdodCAtIDFdO1xuICAgICAgICAgICAgICAgIGlmICghd2FpdGVycylcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgd2FpdGVycy5mb3JFYWNoKCh3YWl0ZXIpID0+IHdhaXRlci5yZXNvbHZlKCkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3dlaWdodGVkV2FpdGVyc1t3ZWlnaHQgLSAxXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgcXVldWVkUHJpb3JpdHkgPSB0aGlzLl9xdWV1ZVswXS5wcmlvcml0eTtcbiAgICAgICAgICAgIGZvciAobGV0IHdlaWdodCA9IHRoaXMuX3ZhbHVlOyB3ZWlnaHQgPiAwOyB3ZWlnaHQtLSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHdhaXRlcnMgPSB0aGlzLl93ZWlnaHRlZFdhaXRlcnNbd2VpZ2h0IC0gMV07XG4gICAgICAgICAgICAgICAgaWYgKCF3YWl0ZXJzKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBpID0gd2FpdGVycy5maW5kSW5kZXgoKHdhaXRlcikgPT4gd2FpdGVyLnByaW9yaXR5IDw9IHF1ZXVlZFByaW9yaXR5KTtcbiAgICAgICAgICAgICAgICAoaSA9PT0gLTEgPyB3YWl0ZXJzIDogd2FpdGVycy5zcGxpY2UoMCwgaSkpXG4gICAgICAgICAgICAgICAgICAgIC5mb3JFYWNoKCh3YWl0ZXIgPT4gd2FpdGVyLnJlc29sdmUoKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIF9jb3VsZExvY2tJbW1lZGlhdGVseSh3ZWlnaHQsIHByaW9yaXR5KSB7XG4gICAgICAgIHJldHVybiAodGhpcy5fcXVldWUubGVuZ3RoID09PSAwIHx8IHRoaXMuX3F1ZXVlWzBdLnByaW9yaXR5IDwgcHJpb3JpdHkpICYmXG4gICAgICAgICAgICB3ZWlnaHQgPD0gdGhpcy5fdmFsdWU7XG4gICAgfVxufVxuZnVuY3Rpb24gaW5zZXJ0U29ydGVkKGEsIHYpIHtcbiAgICBjb25zdCBpID0gZmluZEluZGV4RnJvbUVuZChhLCAob3RoZXIpID0+IHYucHJpb3JpdHkgPD0gb3RoZXIucHJpb3JpdHkpO1xuICAgIGEuc3BsaWNlKGkgKyAxLCAwLCB2KTtcbn1cbmZ1bmN0aW9uIGZpbmRJbmRleEZyb21FbmQoYSwgcHJlZGljYXRlKSB7XG4gICAgZm9yIChsZXQgaSA9IGEubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgaWYgKHByZWRpY2F0ZShhW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG52YXIgX19hd2FpdGVyJDEgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbmNsYXNzIE11dGV4IHtcbiAgICBjb25zdHJ1Y3RvcihjYW5jZWxFcnJvcikge1xuICAgICAgICB0aGlzLl9zZW1hcGhvcmUgPSBuZXcgU2VtYXBob3JlKDEsIGNhbmNlbEVycm9yKTtcbiAgICB9XG4gICAgYWNxdWlyZSgpIHtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlciQxKHRoaXMsIGFyZ3VtZW50cywgdm9pZCAwLCBmdW5jdGlvbiogKHByaW9yaXR5ID0gMCkge1xuICAgICAgICAgICAgY29uc3QgWywgcmVsZWFzZXJdID0geWllbGQgdGhpcy5fc2VtYXBob3JlLmFjcXVpcmUoMSwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlbGVhc2VyO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcnVuRXhjbHVzaXZlKGNhbGxiYWNrLCBwcmlvcml0eSA9IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbWFwaG9yZS5ydW5FeGNsdXNpdmUoKCkgPT4gY2FsbGJhY2soKSwgMSwgcHJpb3JpdHkpO1xuICAgIH1cbiAgICBpc0xvY2tlZCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NlbWFwaG9yZS5pc0xvY2tlZCgpO1xuICAgIH1cbiAgICB3YWl0Rm9yVW5sb2NrKHByaW9yaXR5ID0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2VtYXBob3JlLndhaXRGb3JVbmxvY2soMSwgcHJpb3JpdHkpO1xuICAgIH1cbiAgICByZWxlYXNlKCkge1xuICAgICAgICBpZiAodGhpcy5fc2VtYXBob3JlLmlzTG9ja2VkKCkpXG4gICAgICAgICAgICB0aGlzLl9zZW1hcGhvcmUucmVsZWFzZSgpO1xuICAgIH1cbiAgICBjYW5jZWwoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zZW1hcGhvcmUuY2FuY2VsKCk7XG4gICAgfVxufVxuXG52YXIgX19hd2FpdGVyID0gKHVuZGVmaW5lZCAmJiB1bmRlZmluZWQuX19hd2FpdGVyKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcbiAgICB9KTtcbn07XG5mdW5jdGlvbiB3aXRoVGltZW91dChzeW5jLCB0aW1lb3V0LCB0aW1lb3V0RXJyb3IgPSBFX1RJTUVPVVQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBhY3F1aXJlOiAod2VpZ2h0T3JQcmlvcml0eSwgcHJpb3JpdHkpID0+IHtcbiAgICAgICAgICAgIGxldCB3ZWlnaHQ7XG4gICAgICAgICAgICBpZiAoaXNTZW1hcGhvcmUoc3luYykpIHtcbiAgICAgICAgICAgICAgICB3ZWlnaHQgPSB3ZWlnaHRPclByaW9yaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgd2VpZ2h0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHByaW9yaXR5ID0gd2VpZ2h0T3JQcmlvcml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh3ZWlnaHQgIT09IHVuZGVmaW5lZCAmJiB3ZWlnaHQgPD0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB3ZWlnaHQgJHt3ZWlnaHR9OiBtdXN0IGJlIHBvc2l0aXZlYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgICAgIGxldCBpc1RpbWVvdXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBjb25zdCBoYW5kbGUgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaXNUaW1lb3V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHRpbWVvdXRFcnJvcik7XG4gICAgICAgICAgICAgICAgfSwgdGltZW91dCk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGlja2V0ID0geWllbGQgKGlzU2VtYXBob3JlKHN5bmMpXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHN5bmMuYWNxdWlyZSh3ZWlnaHQsIHByaW9yaXR5KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBzeW5jLmFjcXVpcmUocHJpb3JpdHkpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVGltZW91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsZWFzZSA9IEFycmF5LmlzQXJyYXkodGlja2V0KSA/IHRpY2tldFsxXSA6IHRpY2tldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0aWNrZXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoaGFuZGxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgcnVuRXhjbHVzaXZlKGNhbGxiYWNrLCB3ZWlnaHQsIHByaW9yaXR5KSB7XG4gICAgICAgICAgICByZXR1cm4gX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiogKCkge1xuICAgICAgICAgICAgICAgIGxldCByZWxlYXNlID0gKCkgPT4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpY2tldCA9IHlpZWxkIHRoaXMuYWNxdWlyZSh3ZWlnaHQsIHByaW9yaXR5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGlja2V0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZSA9IHRpY2tldFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB5aWVsZCBjYWxsYmFjayh0aWNrZXRbMF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZSA9IHRpY2tldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB5aWVsZCBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICByZWxlYXNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbGVhc2Uod2VpZ2h0KSB7XG4gICAgICAgICAgICBzeW5jLnJlbGVhc2Uod2VpZ2h0KTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuY2VsKCkge1xuICAgICAgICAgICAgcmV0dXJuIHN5bmMuY2FuY2VsKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHdhaXRGb3JVbmxvY2s6ICh3ZWlnaHRPclByaW9yaXR5LCBwcmlvcml0eSkgPT4ge1xuICAgICAgICAgICAgbGV0IHdlaWdodDtcbiAgICAgICAgICAgIGlmIChpc1NlbWFwaG9yZShzeW5jKSkge1xuICAgICAgICAgICAgICAgIHdlaWdodCA9IHdlaWdodE9yUHJpb3JpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB3ZWlnaHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHkgPSB3ZWlnaHRPclByaW9yaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdlaWdodCAhPT0gdW5kZWZpbmVkICYmIHdlaWdodCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHdlaWdodCAke3dlaWdodH06IG11c3QgYmUgcG9zaXRpdmVgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFuZGxlID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QodGltZW91dEVycm9yKSwgdGltZW91dCk7XG4gICAgICAgICAgICAgICAgKGlzU2VtYXBob3JlKHN5bmMpXG4gICAgICAgICAgICAgICAgICAgID8gc3luYy53YWl0Rm9yVW5sb2NrKHdlaWdodCwgcHJpb3JpdHkpXG4gICAgICAgICAgICAgICAgICAgIDogc3luYy53YWl0Rm9yVW5sb2NrKHByaW9yaXR5KSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNMb2NrZWQ6ICgpID0+IHN5bmMuaXNMb2NrZWQoKSxcbiAgICAgICAgZ2V0VmFsdWU6ICgpID0+IHN5bmMuZ2V0VmFsdWUoKSxcbiAgICAgICAgc2V0VmFsdWU6ICh2YWx1ZSkgPT4gc3luYy5zZXRWYWx1ZSh2YWx1ZSksXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGlzU2VtYXBob3JlKHN5bmMpIHtcbiAgICByZXR1cm4gc3luYy5nZXRWYWx1ZSAhPT0gdW5kZWZpbmVkO1xufVxuXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpc25lIEB0eXBlc2NyaXB0LWVzbGludC9leHBsaWNpdC1tb2R1bGUtYm91bmRhcnktdHlwZXNcbmZ1bmN0aW9uIHRyeUFjcXVpcmUoc3luYywgYWxyZWFkeUFjcXVpcmVkRXJyb3IgPSBFX0FMUkVBRFlfTE9DS0VEKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICByZXR1cm4gd2l0aFRpbWVvdXQoc3luYywgMCwgYWxyZWFkeUFjcXVpcmVkRXJyb3IpO1xufVxuXG5leHBvcnQgeyBFX0FMUkVBRFlfTE9DS0VELCBFX0NBTkNFTEVELCBFX1RJTUVPVVQsIE11dGV4LCBTZW1hcGhvcmUsIHRyeUFjcXVpcmUsIHdpdGhUaW1lb3V0IH07XG4iLCJ2YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRlcXVhbChmb28sIGJhcikge1xuXHR2YXIgY3RvciwgbGVuO1xuXHRpZiAoZm9vID09PSBiYXIpIHJldHVybiB0cnVlO1xuXG5cdGlmIChmb28gJiYgYmFyICYmIChjdG9yPWZvby5jb25zdHJ1Y3RvcikgPT09IGJhci5jb25zdHJ1Y3Rvcikge1xuXHRcdGlmIChjdG9yID09PSBEYXRlKSByZXR1cm4gZm9vLmdldFRpbWUoKSA9PT0gYmFyLmdldFRpbWUoKTtcblx0XHRpZiAoY3RvciA9PT0gUmVnRXhwKSByZXR1cm4gZm9vLnRvU3RyaW5nKCkgPT09IGJhci50b1N0cmluZygpO1xuXG5cdFx0aWYgKGN0b3IgPT09IEFycmF5KSB7XG5cdFx0XHRpZiAoKGxlbj1mb28ubGVuZ3RoKSA9PT0gYmFyLmxlbmd0aCkge1xuXHRcdFx0XHR3aGlsZSAobGVuLS0gJiYgZGVxdWFsKGZvb1tsZW5dLCBiYXJbbGVuXSkpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxlbiA9PT0gLTE7XG5cdFx0fVxuXG5cdFx0aWYgKCFjdG9yIHx8IHR5cGVvZiBmb28gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRsZW4gPSAwO1xuXHRcdFx0Zm9yIChjdG9yIGluIGZvbykge1xuXHRcdFx0XHRpZiAoaGFzLmNhbGwoZm9vLCBjdG9yKSAmJiArK2xlbiAmJiAhaGFzLmNhbGwoYmFyLCBjdG9yKSkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRpZiAoIShjdG9yIGluIGJhcikgfHwgIWRlcXVhbChmb29bY3Rvcl0sIGJhcltjdG9yXSkpIHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBPYmplY3Qua2V5cyhiYXIpLmxlbmd0aCA9PT0gbGVuO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBmb28gIT09IGZvbyAmJiBiYXIgIT09IGJhcjtcbn1cbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuaW1wb3J0IHsgTXV0ZXggfSBmcm9tIFwiYXN5bmMtbXV0ZXhcIjtcbmltcG9ydCB7IGRlcXVhbCB9IGZyb20gXCJkZXF1YWwvbGl0ZVwiO1xuXG4vLyNyZWdpb24gc3JjL2luZGV4LnRzXG4vKipcbiogU2ltcGxpZmllZCBzdG9yYWdlIEFQSXMgd2l0aCBzdXBwb3J0IGZvciB2ZXJzaW9uZWQgZmllbGRzLCBzbmFwc2hvdHMsIG1ldGFkYXRhLCBhbmQgaXRlbSBkZWZpbml0aW9ucy5cbipcbiogU2VlIFt0aGUgZ3VpZGVdKGh0dHBzOi8vd3h0LmRldi9zdG9yYWdlLmh0bWwpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuKiBAbW9kdWxlIEB3eHQtZGV2L3N0b3JhZ2VcbiovXG5jb25zdCBzdG9yYWdlID0gY3JlYXRlU3RvcmFnZSgpO1xuZnVuY3Rpb24gY3JlYXRlU3RvcmFnZSgpIHtcblx0Y29uc3QgZHJpdmVycyA9IHtcblx0XHRsb2NhbDogY3JlYXRlRHJpdmVyKFwibG9jYWxcIiksXG5cdFx0c2Vzc2lvbjogY3JlYXRlRHJpdmVyKFwic2Vzc2lvblwiKSxcblx0XHRzeW5jOiBjcmVhdGVEcml2ZXIoXCJzeW5jXCIpLFxuXHRcdG1hbmFnZWQ6IGNyZWF0ZURyaXZlcihcIm1hbmFnZWRcIilcblx0fTtcblx0Y29uc3QgZ2V0RHJpdmVyID0gKGFyZWEpID0+IHtcblx0XHRjb25zdCBkcml2ZXIgPSBkcml2ZXJzW2FyZWFdO1xuXHRcdGlmIChkcml2ZXIgPT0gbnVsbCkge1xuXHRcdFx0Y29uc3QgYXJlYU5hbWVzID0gT2JqZWN0LmtleXMoZHJpdmVycykuam9pbihcIiwgXCIpO1xuXHRcdFx0dGhyb3cgRXJyb3IoYEludmFsaWQgYXJlYSBcIiR7YXJlYX1cIi4gT3B0aW9uczogJHthcmVhTmFtZXN9YCk7XG5cdFx0fVxuXHRcdHJldHVybiBkcml2ZXI7XG5cdH07XG5cdGNvbnN0IHJlc29sdmVLZXkgPSAoa2V5KSA9PiB7XG5cdFx0Y29uc3QgZGVsaW1pbmF0b3JJbmRleCA9IGtleS5pbmRleE9mKFwiOlwiKTtcblx0XHRjb25zdCBkcml2ZXJBcmVhID0ga2V5LnN1YnN0cmluZygwLCBkZWxpbWluYXRvckluZGV4KTtcblx0XHRjb25zdCBkcml2ZXJLZXkgPSBrZXkuc3Vic3RyaW5nKGRlbGltaW5hdG9ySW5kZXggKyAxKTtcblx0XHRpZiAoZHJpdmVyS2V5ID09IG51bGwpIHRocm93IEVycm9yKGBTdG9yYWdlIGtleSBzaG91bGQgYmUgaW4gdGhlIGZvcm0gb2YgXCJhcmVhOmtleVwiLCBidXQgcmVjZWl2ZWQgXCIke2tleX1cImApO1xuXHRcdHJldHVybiB7XG5cdFx0XHRkcml2ZXJBcmVhLFxuXHRcdFx0ZHJpdmVyS2V5LFxuXHRcdFx0ZHJpdmVyOiBnZXREcml2ZXIoZHJpdmVyQXJlYSlcblx0XHR9O1xuXHR9O1xuXHRjb25zdCBnZXRNZXRhS2V5ID0gKGtleSkgPT4ga2V5ICsgXCIkXCI7XG5cdGNvbnN0IG1lcmdlTWV0YSA9IChvbGRNZXRhLCBuZXdNZXRhKSA9PiB7XG5cdFx0Y29uc3QgbmV3RmllbGRzID0geyAuLi5vbGRNZXRhIH07XG5cdFx0T2JqZWN0LmVudHJpZXMobmV3TWV0YSkuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG5cdFx0XHRpZiAodmFsdWUgPT0gbnVsbCkgZGVsZXRlIG5ld0ZpZWxkc1trZXldO1xuXHRcdFx0ZWxzZSBuZXdGaWVsZHNba2V5XSA9IHZhbHVlO1xuXHRcdH0pO1xuXHRcdHJldHVybiBuZXdGaWVsZHM7XG5cdH07XG5cdGNvbnN0IGdldFZhbHVlT3JGYWxsYmFjayA9ICh2YWx1ZSwgZmFsbGJhY2spID0+IHZhbHVlID8/IGZhbGxiYWNrID8/IG51bGw7XG5cdGNvbnN0IGdldE1ldGFWYWx1ZSA9IChwcm9wZXJ0aWVzKSA9PiB0eXBlb2YgcHJvcGVydGllcyA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwcm9wZXJ0aWVzKSA/IHByb3BlcnRpZXMgOiB7fTtcblx0Y29uc3QgZ2V0SXRlbSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgb3B0cykgPT4ge1xuXHRcdHJldHVybiBnZXRWYWx1ZU9yRmFsbGJhY2soYXdhaXQgZHJpdmVyLmdldEl0ZW0oZHJpdmVyS2V5KSwgb3B0cz8uZmFsbGJhY2sgPz8gb3B0cz8uZGVmYXVsdFZhbHVlKTtcblx0fTtcblx0Y29uc3QgZ2V0TWV0YSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSkgPT4ge1xuXHRcdGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG5cdFx0cmV0dXJuIGdldE1ldGFWYWx1ZShhd2FpdCBkcml2ZXIuZ2V0SXRlbShtZXRhS2V5KSk7XG5cdH07XG5cdGNvbnN0IHNldEl0ZW0gPSBhc3luYyAoZHJpdmVyLCBkcml2ZXJLZXksIHZhbHVlKSA9PiB7XG5cdFx0YXdhaXQgZHJpdmVyLnNldEl0ZW0oZHJpdmVyS2V5LCB2YWx1ZSA/PyBudWxsKTtcblx0fTtcblx0Y29uc3Qgc2V0TWV0YSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcykgPT4ge1xuXHRcdGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG5cdFx0Y29uc3QgZXhpc3RpbmdGaWVsZHMgPSBnZXRNZXRhVmFsdWUoYXdhaXQgZHJpdmVyLmdldEl0ZW0obWV0YUtleSkpO1xuXHRcdGF3YWl0IGRyaXZlci5zZXRJdGVtKG1ldGFLZXksIG1lcmdlTWV0YShleGlzdGluZ0ZpZWxkcywgcHJvcGVydGllcykpO1xuXHR9O1xuXHRjb25zdCByZW1vdmVJdGVtID0gYXN5bmMgKGRyaXZlciwgZHJpdmVyS2V5LCBvcHRzKSA9PiB7XG5cdFx0YXdhaXQgZHJpdmVyLnJlbW92ZUl0ZW0oZHJpdmVyS2V5KTtcblx0XHRpZiAob3B0cz8ucmVtb3ZlTWV0YSkge1xuXHRcdFx0Y29uc3QgbWV0YUtleSA9IGdldE1ldGFLZXkoZHJpdmVyS2V5KTtcblx0XHRcdGF3YWl0IGRyaXZlci5yZW1vdmVJdGVtKG1ldGFLZXkpO1xuXHRcdH1cblx0fTtcblx0Y29uc3QgcmVtb3ZlTWV0YSA9IGFzeW5jIChkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcykgPT4ge1xuXHRcdGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGRyaXZlcktleSk7XG5cdFx0aWYgKHByb3BlcnRpZXMgPT0gbnVsbCkgYXdhaXQgZHJpdmVyLnJlbW92ZUl0ZW0obWV0YUtleSk7XG5cdFx0ZWxzZSB7XG5cdFx0XHRjb25zdCBuZXdGaWVsZHMgPSBnZXRNZXRhVmFsdWUoYXdhaXQgZHJpdmVyLmdldEl0ZW0obWV0YUtleSkpO1xuXHRcdFx0W3Byb3BlcnRpZXNdLmZsYXQoKS5mb3JFYWNoKChmaWVsZCkgPT4gZGVsZXRlIG5ld0ZpZWxkc1tmaWVsZF0pO1xuXHRcdFx0YXdhaXQgZHJpdmVyLnNldEl0ZW0obWV0YUtleSwgbmV3RmllbGRzKTtcblx0XHR9XG5cdH07XG5cdGNvbnN0IHdhdGNoID0gKGRyaXZlciwgZHJpdmVyS2V5LCBjYikgPT4gZHJpdmVyLndhdGNoKGRyaXZlcktleSwgY2IpO1xuXHRyZXR1cm4ge1xuXHRcdGdldEl0ZW06IGFzeW5jIChrZXksIG9wdHMpID0+IHtcblx0XHRcdGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcblx0XHRcdHJldHVybiBhd2FpdCBnZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCBvcHRzKTtcblx0XHR9LFxuXHRcdGdldEl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuXHRcdFx0Y29uc3QgYXJlYVRvS2V5TWFwID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTtcblx0XHRcdGNvbnN0IGtleVRvT3B0c01hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG5cdFx0XHRjb25zdCBvcmRlcmVkS2V5cyA9IFtdO1xuXHRcdFx0a2V5cy5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRcdFx0bGV0IGtleVN0cjtcblx0XHRcdFx0bGV0IG9wdHM7XG5cdFx0XHRcdGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSBrZXlTdHIgPSBrZXk7XG5cdFx0XHRcdGVsc2UgaWYgKFwiZ2V0VmFsdWVcIiBpbiBrZXkpIHtcblx0XHRcdFx0XHRrZXlTdHIgPSBrZXkua2V5O1xuXHRcdFx0XHRcdG9wdHMgPSB7IGZhbGxiYWNrOiBrZXkuZmFsbGJhY2sgfTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRrZXlTdHIgPSBrZXkua2V5O1xuXHRcdFx0XHRcdG9wdHMgPSBrZXkub3B0aW9ucztcblx0XHRcdFx0fVxuXHRcdFx0XHRvcmRlcmVkS2V5cy5wdXNoKGtleVN0cik7XG5cdFx0XHRcdGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleVN0cik7XG5cdFx0XHRcdGNvbnN0IGFyZWFLZXlzID0gYXJlYVRvS2V5TWFwLmdldChkcml2ZXJBcmVhKSA/PyBbXTtcblx0XHRcdFx0YXJlYVRvS2V5TWFwLnNldChkcml2ZXJBcmVhLCBhcmVhS2V5cy5jb25jYXQoZHJpdmVyS2V5KSk7XG5cdFx0XHRcdGtleVRvT3B0c01hcC5zZXQoa2V5U3RyLCBvcHRzKTtcblx0XHRcdH0pO1xuXHRcdFx0Y29uc3QgcmVzdWx0c01hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7XG5cdFx0XHRhd2FpdCBQcm9taXNlLmFsbChBcnJheS5mcm9tKGFyZWFUb0tleU1hcC5lbnRyaWVzKCkpLm1hcChhc3luYyAoW2RyaXZlckFyZWEsIGtleXNdKSA9PiB7XG5cdFx0XHRcdChhd2FpdCBkcml2ZXJzW2RyaXZlckFyZWFdLmdldEl0ZW1zKGtleXMpKS5mb3JFYWNoKChkcml2ZXJSZXN1bHQpID0+IHtcblx0XHRcdFx0XHRjb25zdCBrZXkgPSBgJHtkcml2ZXJBcmVhfToke2RyaXZlclJlc3VsdC5rZXl9YDtcblx0XHRcdFx0XHRjb25zdCBvcHRzID0ga2V5VG9PcHRzTWFwLmdldChrZXkpO1xuXHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gZ2V0VmFsdWVPckZhbGxiYWNrKGRyaXZlclJlc3VsdC52YWx1ZSwgb3B0cz8uZmFsbGJhY2sgPz8gb3B0cz8uZGVmYXVsdFZhbHVlKTtcblx0XHRcdFx0XHRyZXN1bHRzTWFwLnNldChrZXksIHZhbHVlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KSk7XG5cdFx0XHRyZXR1cm4gb3JkZXJlZEtleXMubWFwKChrZXkpID0+ICh7XG5cdFx0XHRcdGtleSxcblx0XHRcdFx0dmFsdWU6IHJlc3VsdHNNYXAuZ2V0KGtleSlcblx0XHRcdH0pKTtcblx0XHR9LFxuXHRcdGdldE1ldGE6IGFzeW5jIChrZXkpID0+IHtcblx0XHRcdGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcblx0XHRcdHJldHVybiBhd2FpdCBnZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5KTtcblx0XHR9LFxuXHRcdGdldE1ldGFzOiBhc3luYyAoYXJncykgPT4ge1xuXHRcdFx0Y29uc3Qga2V5cyA9IGFyZ3MubWFwKChhcmcpID0+IHtcblx0XHRcdFx0Y29uc3Qga2V5ID0gdHlwZW9mIGFyZyA9PT0gXCJzdHJpbmdcIiA/IGFyZyA6IGFyZy5rZXk7XG5cdFx0XHRcdGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0a2V5LFxuXHRcdFx0XHRcdGRyaXZlckFyZWEsXG5cdFx0XHRcdFx0ZHJpdmVyS2V5LFxuXHRcdFx0XHRcdGRyaXZlck1ldGFLZXk6IGdldE1ldGFLZXkoZHJpdmVyS2V5KVxuXHRcdFx0XHR9O1xuXHRcdFx0fSk7XG5cdFx0XHRjb25zdCBhcmVhVG9Ecml2ZXJNZXRhS2V5c01hcCA9IGtleXMucmVkdWNlKChtYXAsIGtleSkgPT4ge1xuXHRcdFx0XHRtYXBba2V5LmRyaXZlckFyZWFdID8/PSBbXTtcblx0XHRcdFx0bWFwW2tleS5kcml2ZXJBcmVhXS5wdXNoKGtleSk7XG5cdFx0XHRcdHJldHVybiBtYXA7XG5cdFx0XHR9LCB7fSk7XG5cdFx0XHRjb25zdCByZXN1bHRzTWFwID0ge307XG5cdFx0XHRhd2FpdCBQcm9taXNlLmFsbChPYmplY3QuZW50cmllcyhhcmVhVG9Ecml2ZXJNZXRhS2V5c01hcCkubWFwKGFzeW5jIChbYXJlYSwga2V5c10pID0+IHtcblx0XHRcdFx0Y29uc3QgYXJlYVJlcyA9IGF3YWl0IGJyb3dzZXIuc3RvcmFnZVthcmVhXS5nZXQoa2V5cy5tYXAoKGtleSkgPT4ga2V5LmRyaXZlck1ldGFLZXkpKTtcblx0XHRcdFx0a2V5cy5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRcdFx0XHRyZXN1bHRzTWFwW2tleS5rZXldID0gYXJlYVJlc1trZXkuZHJpdmVyTWV0YUtleV0gPz8ge307XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSkpO1xuXHRcdFx0cmV0dXJuIGtleXMubWFwKChrZXkpID0+ICh7XG5cdFx0XHRcdGtleToga2V5LmtleSxcblx0XHRcdFx0bWV0YTogcmVzdWx0c01hcFtrZXkua2V5XVxuXHRcdFx0fSkpO1xuXHRcdH0sXG5cdFx0c2V0SXRlbTogYXN5bmMgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGNvbnN0IHsgZHJpdmVyLCBkcml2ZXJLZXkgfSA9IHJlc29sdmVLZXkoa2V5KTtcblx0XHRcdGF3YWl0IHNldEl0ZW0oZHJpdmVyLCBkcml2ZXJLZXksIHZhbHVlKTtcblx0XHR9LFxuXHRcdHNldEl0ZW1zOiBhc3luYyAoaXRlbXMpID0+IHtcblx0XHRcdGNvbnN0IGFyZWFUb0tleVZhbHVlTWFwID0ge307XG5cdFx0XHRpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KFwia2V5XCIgaW4gaXRlbSA/IGl0ZW0ua2V5IDogaXRlbS5pdGVtLmtleSk7XG5cdFx0XHRcdGFyZWFUb0tleVZhbHVlTWFwW2RyaXZlckFyZWFdID8/PSBbXTtcblx0XHRcdFx0YXJlYVRvS2V5VmFsdWVNYXBbZHJpdmVyQXJlYV0ucHVzaCh7XG5cdFx0XHRcdFx0a2V5OiBkcml2ZXJLZXksXG5cdFx0XHRcdFx0dmFsdWU6IGl0ZW0udmFsdWVcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdGF3YWl0IFByb21pc2UuYWxsKE9iamVjdC5lbnRyaWVzKGFyZWFUb0tleVZhbHVlTWFwKS5tYXAoYXN5bmMgKFtkcml2ZXJBcmVhLCB2YWx1ZXNdKSA9PiB7XG5cdFx0XHRcdGF3YWl0IGdldERyaXZlcihkcml2ZXJBcmVhKS5zZXRJdGVtcyh2YWx1ZXMpO1xuXHRcdFx0fSkpO1xuXHRcdH0sXG5cdFx0c2V0TWV0YTogYXN5bmMgKGtleSwgcHJvcGVydGllcykgPT4ge1xuXHRcdFx0Y29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuXHRcdFx0YXdhaXQgc2V0TWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG5cdFx0fSxcblx0XHRzZXRNZXRhczogYXN5bmMgKGl0ZW1zKSA9PiB7XG5cdFx0XHRjb25zdCBhcmVhVG9NZXRhVXBkYXRlc01hcCA9IHt9O1xuXHRcdFx0aXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuXHRcdFx0XHRjb25zdCB7IGRyaXZlckFyZWEsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShcImtleVwiIGluIGl0ZW0gPyBpdGVtLmtleSA6IGl0ZW0uaXRlbS5rZXkpO1xuXHRcdFx0XHRhcmVhVG9NZXRhVXBkYXRlc01hcFtkcml2ZXJBcmVhXSA/Pz0gW107XG5cdFx0XHRcdGFyZWFUb01ldGFVcGRhdGVzTWFwW2RyaXZlckFyZWFdLnB1c2goe1xuXHRcdFx0XHRcdGtleTogZHJpdmVyS2V5LFxuXHRcdFx0XHRcdHByb3BlcnRpZXM6IGl0ZW0ubWV0YVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdFx0YXdhaXQgUHJvbWlzZS5hbGwoT2JqZWN0LmVudHJpZXMoYXJlYVRvTWV0YVVwZGF0ZXNNYXApLm1hcChhc3luYyAoW3N0b3JhZ2VBcmVhLCB1cGRhdGVzXSkgPT4ge1xuXHRcdFx0XHRjb25zdCBkcml2ZXIgPSBnZXREcml2ZXIoc3RvcmFnZUFyZWEpO1xuXHRcdFx0XHRjb25zdCBtZXRhS2V5cyA9IHVwZGF0ZXMubWFwKCh7IGtleSB9KSA9PiBnZXRNZXRhS2V5KGtleSkpO1xuXHRcdFx0XHRjb25zdCBleGlzdGluZ01ldGFzID0gYXdhaXQgZHJpdmVyLmdldEl0ZW1zKG1ldGFLZXlzKTtcblx0XHRcdFx0Y29uc3QgZXhpc3RpbmdNZXRhTWFwID0gT2JqZWN0LmZyb21FbnRyaWVzKGV4aXN0aW5nTWV0YXMubWFwKCh7IGtleSwgdmFsdWUgfSkgPT4gW2tleSwgZ2V0TWV0YVZhbHVlKHZhbHVlKV0pKTtcblx0XHRcdFx0Y29uc3QgbWV0YVVwZGF0ZXMgPSB1cGRhdGVzLm1hcCgoeyBrZXksIHByb3BlcnRpZXMgfSkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IG1ldGFLZXkgPSBnZXRNZXRhS2V5KGtleSk7XG5cdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdGtleTogbWV0YUtleSxcblx0XHRcdFx0XHRcdHZhbHVlOiBtZXJnZU1ldGEoZXhpc3RpbmdNZXRhTWFwW21ldGFLZXldID8/IHt9LCBwcm9wZXJ0aWVzKVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRhd2FpdCBkcml2ZXIuc2V0SXRlbXMobWV0YVVwZGF0ZXMpO1xuXHRcdFx0fSkpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlSXRlbTogYXN5bmMgKGtleSwgb3B0cykgPT4ge1xuXHRcdFx0Y29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuXHRcdFx0YXdhaXQgcmVtb3ZlSXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0cyk7XG5cdFx0fSxcblx0XHRyZW1vdmVJdGVtczogYXN5bmMgKGtleXMpID0+IHtcblx0XHRcdGNvbnN0IGFyZWFUb0tleXNNYXAgPSB7fTtcblx0XHRcdGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XG5cdFx0XHRcdGxldCBrZXlTdHI7XG5cdFx0XHRcdGxldCBvcHRzO1xuXHRcdFx0XHRpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIikga2V5U3RyID0ga2V5O1xuXHRcdFx0XHRlbHNlIGlmIChcImdldFZhbHVlXCIgaW4ga2V5KSBrZXlTdHIgPSBrZXkua2V5O1xuXHRcdFx0XHRlbHNlIGlmIChcIml0ZW1cIiBpbiBrZXkpIHtcblx0XHRcdFx0XHRrZXlTdHIgPSBrZXkuaXRlbS5rZXk7XG5cdFx0XHRcdFx0b3B0cyA9IGtleS5vcHRpb25zO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGtleVN0ciA9IGtleS5rZXk7XG5cdFx0XHRcdFx0b3B0cyA9IGtleS5vcHRpb25zO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IHsgZHJpdmVyQXJlYSwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleVN0cik7XG5cdFx0XHRcdGFyZWFUb0tleXNNYXBbZHJpdmVyQXJlYV0gPz89IFtdO1xuXHRcdFx0XHRhcmVhVG9LZXlzTWFwW2RyaXZlckFyZWFdLnB1c2goZHJpdmVyS2V5KTtcblx0XHRcdFx0aWYgKG9wdHM/LnJlbW92ZU1ldGEpIGFyZWFUb0tleXNNYXBbZHJpdmVyQXJlYV0ucHVzaChnZXRNZXRhS2V5KGRyaXZlcktleSkpO1xuXHRcdFx0fSk7XG5cdFx0XHRhd2FpdCBQcm9taXNlLmFsbChPYmplY3QuZW50cmllcyhhcmVhVG9LZXlzTWFwKS5tYXAoYXN5bmMgKFtkcml2ZXJBcmVhLCBrZXlzXSkgPT4ge1xuXHRcdFx0XHRhd2FpdCBnZXREcml2ZXIoZHJpdmVyQXJlYSkucmVtb3ZlSXRlbXMoa2V5cyk7XG5cdFx0XHR9KSk7XG5cdFx0fSxcblx0XHRjbGVhcjogYXN5bmMgKGJhc2UpID0+IHtcblx0XHRcdGF3YWl0IGdldERyaXZlcihiYXNlKS5jbGVhcigpO1xuXHRcdH0sXG5cdFx0cmVtb3ZlTWV0YTogYXN5bmMgKGtleSwgcHJvcGVydGllcykgPT4ge1xuXHRcdFx0Y29uc3QgeyBkcml2ZXIsIGRyaXZlcktleSB9ID0gcmVzb2x2ZUtleShrZXkpO1xuXHRcdFx0YXdhaXQgcmVtb3ZlTWV0YShkcml2ZXIsIGRyaXZlcktleSwgcHJvcGVydGllcyk7XG5cdFx0fSxcblx0XHRzbmFwc2hvdDogYXN5bmMgKGJhc2UsIG9wdHMpID0+IHtcblx0XHRcdGNvbnN0IGRhdGEgPSBhd2FpdCBnZXREcml2ZXIoYmFzZSkuc25hcHNob3QoKTtcblx0XHRcdG9wdHM/LmV4Y2x1ZGVLZXlzPy5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRcdFx0ZGVsZXRlIGRhdGFba2V5XTtcblx0XHRcdFx0ZGVsZXRlIGRhdGFbZ2V0TWV0YUtleShrZXkpXTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblx0XHRyZXN0b3JlU25hcHNob3Q6IGFzeW5jIChiYXNlLCBkYXRhKSA9PiB7XG5cdFx0XHRhd2FpdCBnZXREcml2ZXIoYmFzZSkucmVzdG9yZVNuYXBzaG90KGRhdGEpO1xuXHRcdH0sXG5cdFx0d2F0Y2g6IChrZXksIGNiKSA9PiB7XG5cdFx0XHRjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG5cdFx0XHRyZXR1cm4gd2F0Y2goZHJpdmVyLCBkcml2ZXJLZXksIGNiKTtcblx0XHR9LFxuXHRcdHVud2F0Y2goKSB7XG5cdFx0XHRPYmplY3QudmFsdWVzKGRyaXZlcnMpLmZvckVhY2goKGRyaXZlcikgPT4ge1xuXHRcdFx0XHRkcml2ZXIudW53YXRjaCgpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRkZWZpbmVJdGVtOiAoa2V5LCBvcHRzKSA9PiB7XG5cdFx0XHRjb25zdCB7IGRyaXZlciwgZHJpdmVyS2V5IH0gPSByZXNvbHZlS2V5KGtleSk7XG5cdFx0XHRjb25zdCB7IHZlcnNpb246IHRhcmdldFZlcnNpb24gPSAxLCBtaWdyYXRpb25zID0ge30sIG9uTWlncmF0aW9uQ29tcGxldGUsIGRlYnVnID0gZmFsc2UgfSA9IG9wdHMgPz8ge307XG5cdFx0XHRpZiAodGFyZ2V0VmVyc2lvbiA8IDEpIHRocm93IEVycm9yKFwiU3RvcmFnZSBpdGVtIHZlcnNpb24gY2Fubm90IGJlIGxlc3MgdGhhbiAxLiBJbml0aWFsIHZlcnNpb25zIHNob3VsZCBiZSBzZXQgdG8gMSwgbm90IDAuXCIpO1xuXHRcdFx0bGV0IG5lZWRzVmVyc2lvblNldCA9IGZhbHNlO1xuXHRcdFx0Y29uc3QgbWlncmF0ZSA9IGFzeW5jICgpID0+IHtcblx0XHRcdFx0Y29uc3QgZHJpdmVyTWV0YUtleSA9IGdldE1ldGFLZXkoZHJpdmVyS2V5KTtcblx0XHRcdFx0Y29uc3QgW3sgdmFsdWUgfSwgeyB2YWx1ZTogbWV0YSB9XSA9IGF3YWl0IGRyaXZlci5nZXRJdGVtcyhbZHJpdmVyS2V5LCBkcml2ZXJNZXRhS2V5XSk7XG5cdFx0XHRcdG5lZWRzVmVyc2lvblNldCA9IHZhbHVlID09IG51bGwgJiYgbWV0YT8udiA9PSBudWxsICYmICEhdGFyZ2V0VmVyc2lvbjtcblx0XHRcdFx0aWYgKHZhbHVlID09IG51bGwpIHJldHVybjtcblx0XHRcdFx0Y29uc3QgY3VycmVudFZlcnNpb24gPSBtZXRhPy52ID8/IDE7XG5cdFx0XHRcdGlmIChjdXJyZW50VmVyc2lvbiA+IHRhcmdldFZlcnNpb24pIHRocm93IEVycm9yKGBWZXJzaW9uIGRvd25ncmFkZSBkZXRlY3RlZCAodiR7Y3VycmVudFZlcnNpb259IC0+IHYke3RhcmdldFZlcnNpb259KSBmb3IgXCIke2tleX1cImApO1xuXHRcdFx0XHRpZiAoY3VycmVudFZlcnNpb24gPT09IHRhcmdldFZlcnNpb24pIHJldHVybjtcblx0XHRcdFx0aWYgKGRlYnVnKSBjb25zb2xlLmRlYnVnKGBbQHd4dC1kZXYvc3RvcmFnZV0gUnVubmluZyBzdG9yYWdlIG1pZ3JhdGlvbiBmb3IgJHtrZXl9OiB2JHtjdXJyZW50VmVyc2lvbn0gLT4gdiR7dGFyZ2V0VmVyc2lvbn1gKTtcblx0XHRcdFx0Y29uc3QgbWlncmF0aW9uc1RvUnVuID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogdGFyZ2V0VmVyc2lvbiAtIGN1cnJlbnRWZXJzaW9uIH0sIChfLCBpKSA9PiBjdXJyZW50VmVyc2lvbiArIGkgKyAxKTtcblx0XHRcdFx0bGV0IG1pZ3JhdGVkVmFsdWUgPSB2YWx1ZTtcblx0XHRcdFx0Zm9yIChjb25zdCBtaWdyYXRlVG9WZXJzaW9uIG9mIG1pZ3JhdGlvbnNUb1J1bikgdHJ5IHtcblx0XHRcdFx0XHRtaWdyYXRlZFZhbHVlID0gYXdhaXQgbWlncmF0aW9ucz8uW21pZ3JhdGVUb1ZlcnNpb25dPy4obWlncmF0ZWRWYWx1ZSkgPz8gbWlncmF0ZWRWYWx1ZTtcblx0XHRcdFx0XHRpZiAoZGVidWcpIGNvbnNvbGUuZGVidWcoYFtAd3h0LWRldi9zdG9yYWdlXSBTdG9yYWdlIG1pZ3JhdGlvbiBwcm9jZXNzZWQgZm9yIHZlcnNpb246IHYke21pZ3JhdGVUb1ZlcnNpb259YCk7XG5cdFx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRcdHRocm93IG5ldyBNaWdyYXRpb25FcnJvcihrZXksIG1pZ3JhdGVUb1ZlcnNpb24sIHsgY2F1c2U6IGVyciB9KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRhd2FpdCBkcml2ZXIuc2V0SXRlbXMoW3tcblx0XHRcdFx0XHRrZXk6IGRyaXZlcktleSxcblx0XHRcdFx0XHR2YWx1ZTogbWlncmF0ZWRWYWx1ZVxuXHRcdFx0XHR9LCB7XG5cdFx0XHRcdFx0a2V5OiBkcml2ZXJNZXRhS2V5LFxuXHRcdFx0XHRcdHZhbHVlOiB7XG5cdFx0XHRcdFx0XHQuLi5tZXRhLFxuXHRcdFx0XHRcdFx0djogdGFyZ2V0VmVyc2lvblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fV0pO1xuXHRcdFx0XHRpZiAoZGVidWcpIGNvbnNvbGUuZGVidWcoYFtAd3h0LWRldi9zdG9yYWdlXSBTdG9yYWdlIG1pZ3JhdGlvbiBjb21wbGV0ZWQgZm9yICR7a2V5fSB2JHt0YXJnZXRWZXJzaW9ufWAsIHsgbWlncmF0ZWRWYWx1ZSB9KTtcblx0XHRcdFx0b25NaWdyYXRpb25Db21wbGV0ZT8uKG1pZ3JhdGVkVmFsdWUsIHRhcmdldFZlcnNpb24pO1xuXHRcdFx0fTtcblx0XHRcdGNvbnN0IG1pZ3JhdGlvbnNEb25lID0gb3B0cz8ubWlncmF0aW9ucyA9PSBudWxsID8gUHJvbWlzZS5yZXNvbHZlKCkgOiBtaWdyYXRlKCkuY2F0Y2goKGVycikgPT4ge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGBbQHd4dC1kZXYvc3RvcmFnZV0gTWlncmF0aW9uIGZhaWxlZCBmb3IgJHtrZXl9YCwgZXJyKTtcblx0XHRcdH0pO1xuXHRcdFx0Y29uc3QgaW5pdE11dGV4ID0gbmV3IE11dGV4KCk7XG5cdFx0XHRjb25zdCBnZXRGYWxsYmFjayA9ICgpID0+IG9wdHM/LmZhbGxiYWNrID8/IG9wdHM/LmRlZmF1bHRWYWx1ZSA/PyBudWxsO1xuXHRcdFx0Y29uc3QgZ2V0T3JJbml0VmFsdWUgPSAoKSA9PiBpbml0TXV0ZXgucnVuRXhjbHVzaXZlKGFzeW5jICgpID0+IHtcblx0XHRcdFx0Y29uc3QgdmFsdWUgPSBhd2FpdCBkcml2ZXIuZ2V0SXRlbShkcml2ZXJLZXkpO1xuXHRcdFx0XHRpZiAodmFsdWUgIT0gbnVsbCB8fCBvcHRzPy5pbml0ID09IG51bGwpIHJldHVybiB2YWx1ZTtcblx0XHRcdFx0Y29uc3QgbmV3VmFsdWUgPSBhd2FpdCBvcHRzLmluaXQoKTtcblx0XHRcdFx0YXdhaXQgZHJpdmVyLnNldEl0ZW0oZHJpdmVyS2V5LCBuZXdWYWx1ZSk7XG5cdFx0XHRcdGlmICh2YWx1ZSA9PSBudWxsICYmIHRhcmdldFZlcnNpb24gPiAxKSBhd2FpdCBzZXRNZXRhKGRyaXZlciwgZHJpdmVyS2V5LCB7IHY6IHRhcmdldFZlcnNpb24gfSk7XG5cdFx0XHRcdHJldHVybiBuZXdWYWx1ZTtcblx0XHRcdH0pO1xuXHRcdFx0bWlncmF0aW9uc0RvbmUudGhlbihnZXRPckluaXRWYWx1ZSk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRrZXksXG5cdFx0XHRcdGdldCBkZWZhdWx0VmFsdWUoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldEZhbGxiYWNrKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldCBmYWxsYmFjaygpIHtcblx0XHRcdFx0XHRyZXR1cm4gZ2V0RmFsbGJhY2soKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0VmFsdWU6IGFzeW5jICgpID0+IHtcblx0XHRcdFx0XHRhd2FpdCBtaWdyYXRpb25zRG9uZTtcblx0XHRcdFx0XHRpZiAob3B0cz8uaW5pdCkgcmV0dXJuIGF3YWl0IGdldE9ySW5pdFZhbHVlKCk7XG5cdFx0XHRcdFx0ZWxzZSByZXR1cm4gYXdhaXQgZ2V0SXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0cyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGdldE1ldGE6IGFzeW5jICgpID0+IHtcblx0XHRcdFx0XHRhd2FpdCBtaWdyYXRpb25zRG9uZTtcblx0XHRcdFx0XHRyZXR1cm4gYXdhaXQgZ2V0TWV0YShkcml2ZXIsIGRyaXZlcktleSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldFZhbHVlOiBhc3luYyAodmFsdWUpID0+IHtcblx0XHRcdFx0XHRhd2FpdCBtaWdyYXRpb25zRG9uZTtcblx0XHRcdFx0XHRpZiAobmVlZHNWZXJzaW9uU2V0KSB7XG5cdFx0XHRcdFx0XHRuZWVkc1ZlcnNpb25TZXQgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGF3YWl0IFByb21pc2UuYWxsKFtzZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCB2YWx1ZSksIHNldE1ldGEoZHJpdmVyLCBkcml2ZXJLZXksIHsgdjogdGFyZ2V0VmVyc2lvbiB9KV0pO1xuXHRcdFx0XHRcdH0gZWxzZSBhd2FpdCBzZXRJdGVtKGRyaXZlciwgZHJpdmVyS2V5LCB2YWx1ZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldE1ldGE6IGFzeW5jIChwcm9wZXJ0aWVzKSA9PiB7XG5cdFx0XHRcdFx0YXdhaXQgbWlncmF0aW9uc0RvbmU7XG5cdFx0XHRcdFx0cmV0dXJuIGF3YWl0IHNldE1ldGEoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZW1vdmVWYWx1ZTogYXN5bmMgKG9wdHMpID0+IHtcblx0XHRcdFx0XHRhd2FpdCBtaWdyYXRpb25zRG9uZTtcblx0XHRcdFx0XHRyZXR1cm4gYXdhaXQgcmVtb3ZlSXRlbShkcml2ZXIsIGRyaXZlcktleSwgb3B0cyk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlbW92ZU1ldGE6IGFzeW5jIChwcm9wZXJ0aWVzKSA9PiB7XG5cdFx0XHRcdFx0YXdhaXQgbWlncmF0aW9uc0RvbmU7XG5cdFx0XHRcdFx0cmV0dXJuIGF3YWl0IHJlbW92ZU1ldGEoZHJpdmVyLCBkcml2ZXJLZXksIHByb3BlcnRpZXMpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR3YXRjaDogKGNiKSA9PiB3YXRjaChkcml2ZXIsIGRyaXZlcktleSwgKG5ld1ZhbHVlLCBvbGRWYWx1ZSkgPT4gY2IobmV3VmFsdWUgPz8gZ2V0RmFsbGJhY2soKSwgb2xkVmFsdWUgPz8gZ2V0RmFsbGJhY2soKSkpLFxuXHRcdFx0XHRtaWdyYXRlXG5cdFx0XHR9O1xuXHRcdH1cblx0fTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZURyaXZlcihzdG9yYWdlQXJlYSkge1xuXHRjb25zdCBnZXRTdG9yYWdlQXJlYSA9ICgpID0+IHtcblx0XHRpZiAoYnJvd3Nlci5ydW50aW1lID09IG51bGwpIHRocm93IEVycm9yKGAnd3h0L3N0b3JhZ2UnIG11c3QgYmUgbG9hZGVkIGluIGEgd2ViIGV4dGVuc2lvbiBlbnZpcm9ubWVudFxuXG4gLSBJZiB0aHJvd24gZHVyaW5nIGEgYnVpbGQsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vd3h0LWRldi93eHQvaXNzdWVzLzM3MVxuIC0gSWYgdGhyb3duIGR1cmluZyB0ZXN0cywgbW9jayAnd3h0L2Jyb3dzZXInIGNvcnJlY3RseS4gU2VlIGh0dHBzOi8vd3h0LmRldi9ndWlkZS9nby1mdXJ0aGVyL3Rlc3RpbmcuaHRtbFxuYCk7XG5cdFx0aWYgKGJyb3dzZXIuc3RvcmFnZSA9PSBudWxsKSB0aHJvdyBFcnJvcihcIllvdSBtdXN0IGFkZCB0aGUgJ3N0b3JhZ2UnIHBlcm1pc3Npb24gdG8geW91ciBtYW5pZmVzdCB0byB1c2UgJ3d4dC9zdG9yYWdlJ1wiKTtcblx0XHRjb25zdCBhcmVhID0gYnJvd3Nlci5zdG9yYWdlW3N0b3JhZ2VBcmVhXTtcblx0XHRpZiAoYXJlYSA9PSBudWxsKSB0aHJvdyBFcnJvcihgXCJicm93c2VyLnN0b3JhZ2UuJHtzdG9yYWdlQXJlYX1cIiBpcyB1bmRlZmluZWRgKTtcblx0XHRyZXR1cm4gYXJlYTtcblx0fTtcblx0Y29uc3Qgd2F0Y2hMaXN0ZW5lcnMgPSAvKiBAX19QVVJFX18gKi8gbmV3IFNldCgpO1xuXHRyZXR1cm4ge1xuXHRcdGdldEl0ZW06IGFzeW5jIChrZXkpID0+IHtcblx0XHRcdHJldHVybiAoYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5nZXQoa2V5KSlba2V5XTtcblx0XHR9LFxuXHRcdGdldEl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5nZXQoa2V5cyk7XG5cdFx0XHRyZXR1cm4ga2V5cy5tYXAoKGtleSkgPT4gKHtcblx0XHRcdFx0a2V5LFxuXHRcdFx0XHR2YWx1ZTogcmVzdWx0W2tleV0gPz8gbnVsbFxuXHRcdFx0fSkpO1xuXHRcdH0sXG5cdFx0c2V0SXRlbTogYXN5bmMgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGlmICh2YWx1ZSA9PSBudWxsKSBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnJlbW92ZShrZXkpO1xuXHRcdFx0ZWxzZSBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldCh7IFtrZXldOiB2YWx1ZSB9KTtcblx0XHR9LFxuXHRcdHNldEl0ZW1zOiBhc3luYyAodmFsdWVzKSA9PiB7XG5cdFx0XHRjb25zdCBtYXAgPSB2YWx1ZXMucmVkdWNlKChtYXAsIHsga2V5LCB2YWx1ZSB9KSA9PiB7XG5cdFx0XHRcdG1hcFtrZXldID0gdmFsdWU7XG5cdFx0XHRcdHJldHVybiBtYXA7XG5cdFx0XHR9LCB7fSk7XG5cdFx0XHRhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLnNldChtYXApO1xuXHRcdH0sXG5cdFx0cmVtb3ZlSXRlbTogYXN5bmMgKGtleSkgPT4ge1xuXHRcdFx0YXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5KTtcblx0XHR9LFxuXHRcdHJlbW92ZUl0ZW1zOiBhc3luYyAoa2V5cykgPT4ge1xuXHRcdFx0YXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5yZW1vdmUoa2V5cyk7XG5cdFx0fSxcblx0XHRjbGVhcjogYXN5bmMgKCkgPT4ge1xuXHRcdFx0YXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5jbGVhcigpO1xuXHRcdH0sXG5cdFx0c25hcHNob3Q6IGFzeW5jICgpID0+IHtcblx0XHRcdHJldHVybiBhd2FpdCBnZXRTdG9yYWdlQXJlYSgpLmdldCgpO1xuXHRcdH0sXG5cdFx0cmVzdG9yZVNuYXBzaG90OiBhc3luYyAoZGF0YSkgPT4ge1xuXHRcdFx0YXdhaXQgZ2V0U3RvcmFnZUFyZWEoKS5zZXQoZGF0YSk7XG5cdFx0fSxcblx0XHR3YXRjaChrZXksIGNiKSB7XG5cdFx0XHRjb25zdCBsaXN0ZW5lciA9IChjaGFuZ2VzKSA9PiB7XG5cdFx0XHRcdGNvbnN0IGNoYW5nZSA9IGNoYW5nZXNba2V5XTtcblx0XHRcdFx0aWYgKGNoYW5nZSA9PSBudWxsIHx8IGRlcXVhbChjaGFuZ2UubmV3VmFsdWUsIGNoYW5nZS5vbGRWYWx1ZSkpIHJldHVybjtcblx0XHRcdFx0Y2IoY2hhbmdlLm5ld1ZhbHVlID8/IG51bGwsIGNoYW5nZS5vbGRWYWx1ZSA/PyBudWxsKTtcblx0XHRcdH07XG5cdFx0XHRnZXRTdG9yYWdlQXJlYSgpLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG5cdFx0XHR3YXRjaExpc3RlbmVycy5hZGQobGlzdGVuZXIpO1xuXHRcdFx0cmV0dXJuICgpID0+IHtcblx0XHRcdFx0Z2V0U3RvcmFnZUFyZWEoKS5vbkNoYW5nZWQucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpO1xuXHRcdFx0XHR3YXRjaExpc3RlbmVycy5kZWxldGUobGlzdGVuZXIpO1xuXHRcdFx0fTtcblx0XHR9LFxuXHRcdHVud2F0Y2goKSB7XG5cdFx0XHR3YXRjaExpc3RlbmVycy5mb3JFYWNoKChsaXN0ZW5lcikgPT4ge1xuXHRcdFx0XHRnZXRTdG9yYWdlQXJlYSgpLm9uQ2hhbmdlZC5yZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG5cdFx0XHR9KTtcblx0XHRcdHdhdGNoTGlzdGVuZXJzLmNsZWFyKCk7XG5cdFx0fVxuXHR9O1xufVxudmFyIE1pZ3JhdGlvbkVycm9yID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG5cdGNvbnN0cnVjdG9yKGtleSwgdmVyc2lvbiwgb3B0aW9ucykge1xuXHRcdHN1cGVyKGB2JHt2ZXJzaW9ufSBtaWdyYXRpb24gZmFpbGVkIGZvciBcIiR7a2V5fVwiYCwgb3B0aW9ucyk7XG5cdFx0dGhpcy5rZXkgPSBrZXk7XG5cdFx0dGhpcy52ZXJzaW9uID0gdmVyc2lvbjtcblx0fVxufTtcblxuLy8jZW5kcmVnaW9uXG5leHBvcnQgeyBNaWdyYXRpb25FcnJvciwgc3RvcmFnZSB9OyIsImltcG9ydCB7IFN0b3JlIH0gZnJvbSBcIkAvdHlwZXMvdHlwZXNcIjtcbmltcG9ydCB7IHN0b3JhZ2UgfSBmcm9tIFwid3h0L3N0b3JhZ2VcIjtcblxuZXhwb3J0IGNvbnN0IGRlZmF1bHRTdG9yZTogU3RvcmUgPSB7XG4gIGVudjogXCJcIixcbiAgZW5hYmxlZDogdHJ1ZSxcbiAgcmlwcGxlRW5hYmxlZDogdHJ1ZSxcbiAgc21hcnRDdXJzb3JFbmFibGVkOiB0cnVlLFxuICBzdHJpY3RTYWZldHk6IHRydWUsXG4gIGxvbmdQcmVzc0RlbGF5OiAyMDAsXG4gIHByaW1hcnlDb2xvcjogXCIjMDBGRkZGXCIsXG4gIHRvcEVkZ2VFeGl0RW5hYmxlZDogdHJ1ZSxcbiAgYXV0b0Z1bGxzY3JlZW5FbmFibGVkOiB0cnVlLFxuICBvbmVXYXlGdWxsc2NyZWVuOiBmYWxzZSxcbiAgYXV0b0Z1bGxzY3JlZW5Pbk5ld1ZpZGVvOiB0cnVlLFxuICBmdWxsc2NyZWVuVmlkZW86IGZhbHNlLFxufTtcblxuZXhwb3J0IGNvbnN0IHN0b3JlID0gc3RvcmFnZS5kZWZpbmVJdGVtPFN0b3JlPihcInN5bmM6c3RvcmVcIiwge1xuICBmYWxsYmFjazogZGVmYXVsdFN0b3JlLFxufSk7XG4iLCJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uO1xufVxuIiwiaW1wb3J0IHsgc3RvcmUgfSBmcm9tIFwiQC91dGlscy9zdG9yZVwiO1xuaW1wb3J0IHsgZGVmaW5lQ29udGVudFNjcmlwdCB9IGZyb20gXCJ3eHQvc2FuZGJveFwiO1xuXG5jb25zdCBNT0RJRklFUl9LRVkgPSBcImFmX21vZGlmaWVyXCI7XG5jb25zdCBNT0RJRklFUl9UVEwgPSAxNTAwMDtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XG4gIG1hdGNoZXM6IFtcIjxhbGxfdXJscz5cIl0sXG4gIGFzeW5jIG1haW4oKSB7XG4gICAgLy8gTG9hZCBhbGwgc2V0dGluZ3MgaW4gb25lIGNhbGxcbiAgICBjb25zdCBzID0gYXdhaXQgc3RvcmUuZ2V0VmFsdWUoKTtcbiAgICBsZXQgaXNFbmFibGVkID0gcy5lbmFibGVkO1xuICAgIGxldCBhdXRvRnVsbHNjcmVlbkVuYWJsZWQgPSBzLmF1dG9GdWxsc2NyZWVuRW5hYmxlZDtcbiAgICBsZXQgb25lV2F5RnVsbHNjcmVlbiA9IHMub25lV2F5RnVsbHNjcmVlbjtcbiAgICBsZXQgYXV0b0Z1bGxzY3JlZW5Pbk5ld1ZpZGVvID0gcy5hdXRvRnVsbHNjcmVlbk9uTmV3VmlkZW87XG4gICAgbGV0IHN0cmljdFNhZmV0eSA9IHMuc3RyaWN0U2FmZXR5O1xuICAgIGxldCBsb25nUHJlc3NEZWxheSA9IHMubG9uZ1ByZXNzRGVsYXk7XG4gICAgbGV0IHRvcEVkZ2VFeGl0RW5hYmxlZCA9IHMudG9wRWRnZUV4aXRFbmFibGVkO1xuICAgIGxldCByaXBwbGVFbmFibGVkID0gcy5yaXBwbGVFbmFibGVkO1xuICAgIGxldCBwcmltYXJ5Q29sb3IgPSBzLnByaW1hcnlDb2xvciB8fCBcIiMwMEZGRkZcIjtcbiAgICBsZXQgZnVsbHNjcmVlblZpZGVvID0gcy5mdWxsc2NyZWVuVmlkZW87XG5cbiAgICAvLyAtLS0gU3RhdGUgLS0tXG4gICAgbGV0IG5ld1RhYkludGVudCA9IGZhbHNlO1xuICAgIGxldCBsYXN0RnVsbHNjcmVlbmVkVmlkZW86IEhUTUxWaWRlb0VsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgbGFzdEZ1bGxzY3JlZW5lZFVybCA9IFwiXCI7XG4gICAgY29uc3QgTU1CX0tFWSA9IFwiYWZfbW1iX2ludGVudFwiO1xuXG4gICAgLy8gLS0tIEhlbHBlcjogZmluZCBtYWluIHZpZGVvIG9uIHBhZ2UgLS0tXG4gICAgY29uc3QgZmluZE1haW5WaWRlbyA9ICgpOiBIVE1MVmlkZW9FbGVtZW50IHwgbnVsbCA9PiB7XG4gICAgICBjb25zdCB2aWRlb3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwidmlkZW9cIik7XG4gICAgICBsZXQgYmVzdDogSFRNTFZpZGVvRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICAgICAgbGV0IGJlc3RBcmVhID0gMDtcbiAgICAgIGZvciAoY29uc3QgdiBvZiB2aWRlb3MpIHtcbiAgICAgICAgY29uc3QgYXJlYSA9IHYub2Zmc2V0V2lkdGggKiB2Lm9mZnNldEhlaWdodDtcbiAgICAgICAgaWYgKGFyZWEgPiBiZXN0QXJlYSAmJiB2Lm9mZnNldFdpZHRoID49IDIwMCAmJiB2Lm9mZnNldEhlaWdodCA+PSAxNTApIHtcbiAgICAgICAgICBiZXN0ID0gdjtcbiAgICAgICAgICBiZXN0QXJlYSA9IGFyZWE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBiZXN0O1xuICAgIH07XG5cbiAgICAvLyAtLS0gSGVscGVyOiBkbyBmdWxsc2NyZWVuIC0tLVxuICAgIC8vIGhhc0dlc3R1cmU9dHJ1ZSBtZWFucyB3ZSdyZSBpbiBhIG1vdXNlZG93biBoYW5kbGVyIGFuZCByZXF1ZXN0RnVsbHNjcmVlbigpIHdpbGwgd29ya1xuICAgIGNvbnN0IGRvRnVsbHNjcmVlbiA9IChoYXNHZXN0dXJlID0gZmFsc2UpID0+IHtcbiAgICAgIGlmIChmdWxsc2NyZWVuVmlkZW8gJiYgaGFzR2VzdHVyZSkge1xuICAgICAgICBjb25zdCB2aWRlbyA9IGZpbmRNYWluVmlkZW8oKTtcbiAgICAgICAgaWYgKHZpZGVvICYmICFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgIHZpZGVvLnJlcXVlc3RGdWxsc2NyZWVuKCkuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgYnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKHsgYWN0aW9uOiBcInNldFdpbmRvd0Z1bGxzY3JlZW5cIiB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyb3dzZXIucnVudGltZS5zZW5kTWVzc2FnZSh7IGFjdGlvbjogXCJzZXRXaW5kb3dGdWxsc2NyZWVuXCIgfSk7XG4gICAgfTtcblxuICAgIC8vIC0tLSBQZXJzaXN0IG1vZGlmaWVyIHN0YXRlIHRvIHN0b3JhZ2UgKHN1cnZpdmVzIGtleXVwIHRpbWluZykgLS0tXG4gICAgY29uc3Qgc2F2ZU1vZGlmaWVyU3RhdGUgPSAoYWN0aXZlOiBib29sZWFuKSA9PiB7XG4gICAgICBpZiAoYWN0aXZlKSB7XG4gICAgICAgIGJyb3dzZXIuc3RvcmFnZS5sb2NhbC5zZXQoeyBbTU9ESUZJRVJfS0VZXTogeyB0czogRGF0ZS5ub3coKSB9IH0pLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyb3dzZXIuc3RvcmFnZS5sb2NhbC5yZW1vdmUoTU9ESUZJRVJfS0VZKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIC0tLSBSZWdpc3RlciBBTEwgZXZlbnQgaGFuZGxlcnMgRklSU1QgLS0tXG5cbiAgICAvLyBQaHlzaWNhbCBtb2RpZmllciBrZXkgZGV0ZWN0aW9uXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwia2V5ZG93blwiLFxuICAgICAgKGUpID0+IHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGUuZ2V0TW9kaWZpZXJTdGF0ZShcIkNvbnRyb2xcIikgfHxcbiAgICAgICAgICBlLmdldE1vZGlmaWVyU3RhdGUoXCJNZXRhXCIpIHx8XG4gICAgICAgICAgZS5nZXRNb2RpZmllclN0YXRlKFwiQWx0XCIpXG4gICAgICAgICkge1xuICAgICAgICAgIG5ld1RhYkludGVudCA9IHRydWU7XG4gICAgICAgICAgc2F2ZU1vZGlmaWVyU3RhdGUodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB0cnVlLFxuICAgICk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZSkgPT4ge1xuICAgICAgaWYgKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpIHtcbiAgICAgICAgYnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKHsgYWN0aW9uOiBcInNldE1vZGlmaWVyc1wiLCBjdHJsOiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZSkgPT4ge1xuICAgICAgaWYgKCFlLmN0cmxLZXkgJiYgIWUubWV0YUtleSkge1xuICAgICAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyBhY3Rpb246IFwic2V0TW9kaWZpZXJzXCIsIGN0cmw6IGZhbHNlIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gLS0tIFRvcCBlZGdlIGV4aXQgLS0tXG4gICAgY29uc3QgVE9QX0VER0VfVEhSRVNIT0xEID0gMjA7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwibW91c2Vtb3ZlXCIsXG4gICAgICAoZTogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBpZiAoIXRvcEVkZ2VFeGl0RW5hYmxlZCB8fCAhaXNFbmFibGVkKSByZXR1cm47XG4gICAgICAgIGlmIChlLmNsaWVudFkgPD0gVE9QX0VER0VfVEhSRVNIT0xEKSB7XG4gICAgICAgICAgYnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKHsgYWN0aW9uOiBcImV4aXRXaW5kb3dGdWxsc2NyZWVuXCIgfSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB0cnVlLFxuICAgICk7XG5cbiAgICAvLyAtLS0gU3RyaWN0IHNhZmV0eTogY2hlY2sgaWYgdGFyZ2V0IGlzIGludGVyYWN0aXZlIC0tLVxuICAgIGNvbnN0IGlzSW50ZXJhY3RpdmUgPSAodGFyZ2V0OiBFdmVudFRhcmdldCB8IG51bGwpOiBib29sZWFuID0+IHtcbiAgICAgIGlmICghc3RyaWN0U2FmZXR5KSByZXR1cm4gZmFsc2U7XG4gICAgICBjb25zdCBlbCA9IHRhcmdldCBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICBpZiAoIWVsKSByZXR1cm4gZmFsc2U7XG4gICAgICBsZXQgbm9kZTogSFRNTEVsZW1lbnQgfCBudWxsID0gZWw7XG4gICAgICB3aGlsZSAobm9kZSAmJiBub2RlICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgIGNvbnN0IHRhZyA9IG5vZGUudGFnTmFtZTtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRhZyA9PT0gXCJBXCIgfHwgdGFnID09PSBcIkJVVFRPTlwiIHx8IHRhZyA9PT0gXCJJTlBVVFwiIHx8XG4gICAgICAgICAgdGFnID09PSBcIlNFTEVDVFwiIHx8IHRhZyA9PT0gXCJURVhUQVJFQVwiIHx8IHRhZyA9PT0gXCJMQUJFTFwiIHx8XG4gICAgICAgICAgbm9kZS5nZXRBdHRyaWJ1dGUoXCJyb2xlXCIpID09PSBcImJ1dHRvblwiIHx8XG4gICAgICAgICAgbm9kZS5nZXRBdHRyaWJ1dGUoXCJyb2xlXCIpID09PSBcImxpbmtcIiB8fFxuICAgICAgICAgIG5vZGUuaXNDb250ZW50RWRpdGFibGVcbiAgICAgICAgKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50RWxlbWVudDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgLy8gLS0tIENoYXJnZSByaW5nIC0tLVxuICAgIGxldCBjaGFyZ2VUaW1lcjogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY2hhcmdlU3RhcnRYID0gMDtcbiAgICBsZXQgY2hhcmdlU3RhcnRZID0gMDtcbiAgICBsZXQgY2hhcmdlQ29tcGxldGVkID0gZmFsc2U7XG4gICAgbGV0IGNoYXJnZVJpbmdFbDogSFRNTERpdkVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgY2hhcmdlUmluZ0FuaW06IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAgIGNvbnN0IENIQVJHRV9SSU5HX1NJWkUgPSA0NDtcbiAgICBjb25zdCBDSEFSR0VfUklOR19TVFJPS0UgPSAzO1xuXG4gICAgY29uc3Qgc2hvd0NoYXJnZVJpbmcgPSAoeDogbnVtYmVyLCB5OiBudW1iZXIsIGR1cmF0aW9uOiBudW1iZXIpID0+IHtcbiAgICAgIHJlbW92ZUNoYXJnZVJpbmcoKTtcbiAgICAgIGlmICghcmlwcGxlRW5hYmxlZCkgcmV0dXJuO1xuXG4gICAgICBjb25zdCBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICBjb25zdCBzaXplID0gQ0hBUkdFX1JJTkdfU0laRTtcbiAgICAgIGNvbnN0IHIgPSAoc2l6ZSAtIENIQVJHRV9SSU5HX1NUUk9LRSAqIDIpIC8gMjtcbiAgICAgIGNvbnN0IGN4ID0gc2l6ZSAvIDI7XG4gICAgICBjb25zdCBjaXJjdW1mZXJlbmNlID0gMiAqIE1hdGguUEkgKiByO1xuXG4gICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gYHBvc2l0aW9uOmZpeGVkO2xlZnQ6JHt4IC0gc2l6ZSAvIDJ9cHg7dG9wOiR7eSAtIHNpemUgLyAyfXB4O3dpZHRoOiR7c2l6ZX1weDtoZWlnaHQ6JHtzaXplfXB4O3BvaW50ZXItZXZlbnRzOm5vbmU7ei1pbmRleDoyMTQ3NDgzNjQ3O2A7XG4gICAgICBlbC5pbm5lckhUTUwgPSBgPHN2ZyB3aWR0aD1cIiR7c2l6ZX1cIiBoZWlnaHQ9XCIke3NpemV9XCIgdmlld0JveD1cIjAgMCAke3NpemV9ICR7c2l6ZX1cIj48Y2lyY2xlIGN4PVwiJHtjeH1cIiBjeT1cIiR7Y3h9XCIgcj1cIiR7cn1cIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cInJnYmEoMjU1LDI1NSwyNTUsMC4xNSlcIiBzdHJva2Utd2lkdGg9XCIke0NIQVJHRV9SSU5HX1NUUk9LRX1cIi8+PGNpcmNsZSBjbGFzcz1cImFmLXJpbmdcIiBjeD1cIiR7Y3h9XCIgY3k9XCIke2N4fVwiIHI9XCIke3J9XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCIke3ByaW1hcnlDb2xvcn1cIiBzdHJva2Utd2lkdGg9XCIke0NIQVJHRV9SSU5HX1NUUk9LRX1cIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWRhc2hhcnJheT1cIiR7Y2lyY3VtZmVyZW5jZX1cIiBzdHJva2UtZGFzaG9mZnNldD1cIiR7Y2lyY3VtZmVyZW5jZX1cIiB0cmFuc2Zvcm09XCJyb3RhdGUoLTkwICR7Y3h9ICR7Y3h9KVwiLz48L3N2Zz5gO1xuXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGVsKTtcbiAgICAgIGNoYXJnZVJpbmdFbCA9IGVsO1xuXG4gICAgICBjb25zdCByaW5nID0gZWwucXVlcnlTZWxlY3RvcihcIi5hZi1yaW5nXCIpIGFzIFNWR0NpcmNsZUVsZW1lbnQgfCBudWxsO1xuICAgICAgaWYgKCFyaW5nKSByZXR1cm47XG4gICAgICBjb25zdCBzdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuXG4gICAgICBjb25zdCB0aWNrID0gKG5vdzogbnVtYmVyKSA9PiB7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gTWF0aC5taW4oKG5vdyAtIHN0YXJ0KSAvIGR1cmF0aW9uLCAxKTtcbiAgICAgICAgY29uc3QgZWFzZWQgPSAxIC0gKDEgLSBwcm9ncmVzcykgKiAoMSAtIHByb2dyZXNzKTtcbiAgICAgICAgcmluZy5zdHlsZS5zdHJva2VEYXNob2Zmc2V0ID0gU3RyaW5nKGNpcmN1bWZlcmVuY2UgKiAoMSAtIGVhc2VkKSk7XG4gICAgICAgIGVsLnN0eWxlLm9wYWNpdHkgPSBTdHJpbmcoMC40ICsgZWFzZWQgKiAwLjUpO1xuICAgICAgICBpZiAocHJvZ3Jlc3MgPCAxKSBjaGFyZ2VSaW5nQW5pbSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcbiAgICAgIH07XG4gICAgICBjaGFyZ2VSaW5nQW5pbSA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcbiAgICB9O1xuXG4gICAgY29uc3QgcmVtb3ZlQ2hhcmdlUmluZyA9ICgpID0+IHtcbiAgICAgIGlmIChjaGFyZ2VSaW5nQW5pbSkgeyBjYW5jZWxBbmltYXRpb25GcmFtZShjaGFyZ2VSaW5nQW5pbSk7IGNoYXJnZVJpbmdBbmltID0gbnVsbDsgfVxuICAgICAgaWYgKGNoYXJnZVJpbmdFbCkgeyBjaGFyZ2VSaW5nRWwucmVtb3ZlKCk7IGNoYXJnZVJpbmdFbCA9IG51bGw7IH1cbiAgICB9O1xuXG4gICAgY29uc3QgY29tcGxldGVDaGFyZ2VSaW5nID0gKCkgPT4ge1xuICAgICAgaWYgKGNoYXJnZVJpbmdBbmltKSB7IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGNoYXJnZVJpbmdBbmltKTsgY2hhcmdlUmluZ0FuaW0gPSBudWxsOyB9XG4gICAgICBpZiAoY2hhcmdlUmluZ0VsKSB7XG4gICAgICAgIGNoYXJnZVJpbmdFbC5zdHlsZS50cmFuc2l0aW9uID0gXCJvcGFjaXR5IDAuMTVzIGVhc2Utb3V0LCB0cmFuc2Zvcm0gMC4xNXMgZWFzZS1vdXRcIjtcbiAgICAgICAgY2hhcmdlUmluZ0VsLnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcbiAgICAgICAgY2hhcmdlUmluZ0VsLnN0eWxlLnRyYW5zZm9ybSA9IFwic2NhbGUoMS4zKVwiO1xuICAgICAgICBjb25zdCBlbCA9IGNoYXJnZVJpbmdFbDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbC5yZW1vdmUoKSwgMTUwKTtcbiAgICAgICAgY2hhcmdlUmluZ0VsID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gLS0tIE1vdXNlZG93biBoYW5kbGVyIC0tLVxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcIm1vdXNlZG93blwiLFxuICAgICAgKGU6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgaGFzTW9kaWZpZXIgPVxuICAgICAgICAgIGUuY3RybEtleSB8fCBlLm1ldGFLZXkgfHwgZS5hbHRLZXkgfHwgZS5idXR0b24gPT09IDEgfHxcbiAgICAgICAgICBlLmdldE1vZGlmaWVyU3RhdGUoXCJDb250cm9sXCIpIHx8IGUuZ2V0TW9kaWZpZXJTdGF0ZShcIk1ldGFcIikgfHwgZS5nZXRNb2RpZmllclN0YXRlKFwiQWx0XCIpO1xuXG4gICAgICAgIGlmIChoYXNNb2RpZmllcikge1xuICAgICAgICAgIG5ld1RhYkludGVudCA9IHRydWU7XG4gICAgICAgICAgc2F2ZU1vZGlmaWVyU3RhdGUodHJ1ZSk7XG4gICAgICAgICAgYnJvd3Nlci5zdG9yYWdlLmxvY2FsLnNldCh7IFtNTUJfS0VZXTogeyB1cmw6IGxvY2F0aW9uLmhyZWYgfSB9KS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICAgICAgYnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKHsgYWN0aW9uOiBcInNldE1vZGlmaWVyc1wiLCBjdHJsOiB0cnVlIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaXNFbmFibGVkIHx8IGUuYnV0dG9uICE9PSAwIHx8IGlzSW50ZXJhY3RpdmUoZS50YXJnZXQpKSByZXR1cm47XG4gICAgICAgIGlmIChjaGFyZ2VUaW1lcikgeyBjbGVhclRpbWVvdXQoY2hhcmdlVGltZXIpOyBjaGFyZ2VUaW1lciA9IG51bGw7IH1cblxuICAgICAgICBjaGFyZ2VTdGFydFggPSBlLmNsaWVudFg7XG4gICAgICAgIGNoYXJnZVN0YXJ0WSA9IGUuY2xpZW50WTtcbiAgICAgICAgY2hhcmdlQ29tcGxldGVkID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKGxvbmdQcmVzc0RlbGF5ID09PSAwKSB7XG4gICAgICAgICAgY2hhcmdlQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICBkb0Z1bGxzY3JlZW4odHJ1ZSk7IC8vIGhhcyBnZXN0dXJlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2hvd0NoYXJnZVJpbmcoZS5jbGllbnRYLCBlLmNsaWVudFksIGxvbmdQcmVzc0RlbGF5KTtcbiAgICAgICAgICBjaGFyZ2VUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY2hhcmdlVGltZXIgPSBudWxsO1xuICAgICAgICAgICAgY2hhcmdlQ29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbXBsZXRlQ2hhcmdlUmluZygpO1xuICAgICAgICAgICAgZG9GdWxsc2NyZWVuKCk7XG4gICAgICAgICAgfSwgbG9uZ1ByZXNzRGVsYXkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgdHJ1ZSxcbiAgICApO1xuXG4gICAgLy8gQ2FuY2VsIGNoYXJnZSBpZiBtb3VzZSBtb3ZlcyB0b28gZmFyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwibW91c2Vtb3ZlXCIsXG4gICAgICAoZTogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICBpZiAoIWNoYXJnZVRpbWVyKSByZXR1cm47XG4gICAgICAgIGNvbnN0IGR4ID0gTWF0aC5hYnMoZS5jbGllbnRYIC0gY2hhcmdlU3RhcnRYKTtcbiAgICAgICAgY29uc3QgZHkgPSBNYXRoLmFicyhlLmNsaWVudFkgLSBjaGFyZ2VTdGFydFkpO1xuICAgICAgICBpZiAoZHggPiA1MCB8fCBkeSA+IDUwKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KGNoYXJnZVRpbWVyKTtcbiAgICAgICAgICBjaGFyZ2VUaW1lciA9IG51bGw7XG4gICAgICAgICAgcmVtb3ZlQ2hhcmdlUmluZygpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgdHJ1ZSxcbiAgICApO1xuXG4gICAgLy8gQ2FuY2VsIGNoYXJnZSBpZiBtb3VzZSByZWxlYXNlZCBiZWZvcmUgdGltZXJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgXCJtb3VzZXVwXCIsXG4gICAgICAoKSA9PiB7XG4gICAgICAgIGlmIChjaGFyZ2VUaW1lcikge1xuICAgICAgICAgIGNsZWFyVGltZW91dChjaGFyZ2VUaW1lcik7XG4gICAgICAgICAgY2hhcmdlVGltZXIgPSBudWxsO1xuICAgICAgICAgIHJlbW92ZUNoYXJnZVJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHRydWUsXG4gICAgKTtcblxuICAgIC8vIC0tLSBTUEEgVVJMIGNoYW5nZSBkZXRlY3Rpb24gLS0tXG4gICAgbGV0IGxhc3RLbm93blVybCA9IGxvY2F0aW9uLmhyZWY7XG5cbiAgICBjb25zdCBjaGVja1VybENoYW5nZSA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnRVcmwgPSBsb2NhdGlvbi5ocmVmO1xuICAgICAgaWYgKGN1cnJlbnRVcmwgIT09IGxhc3RLbm93blVybCkge1xuICAgICAgICBsYXN0S25vd25VcmwgPSBjdXJyZW50VXJsO1xuICAgICAgICBpZiAoaXNFbmFibGVkICYmIGF1dG9GdWxsc2NyZWVuRW5hYmxlZCAmJiBhdXRvRnVsbHNjcmVlbk9uTmV3VmlkZW8gJiYgIW5ld1RhYkludGVudCkge1xuICAgICAgICAgIGxhc3RGdWxsc2NyZWVuZWRWaWRlbyA9IGZpbmRNYWluVmlkZW8oKTtcbiAgICAgICAgICBsYXN0RnVsbHNjcmVlbmVkVXJsID0gbGFzdEZ1bGxzY3JlZW5lZFZpZGVvPy5jdXJyZW50U3JjIHx8IGxhc3RGdWxsc2NyZWVuZWRWaWRlbz8uc3JjIHx8IFwiXCI7XG4gICAgICAgICAgZG9GdWxsc2NyZWVuKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG5ld1RhYkludGVudCA9IGZhbHNlO1xuICAgICAgYnJvd3Nlci5zdG9yYWdlLmxvY2FsLnJlbW92ZShNTUJfS0VZKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgfTtcblxuICAgIC8vIFBhdGNoIGhpc3RvcnkgbWV0aG9kcyBmb3IgaW5zdGFudCBTUEEgZGV0ZWN0aW9uXG4gICAgY29uc3Qgb3JpZ1B1c2hTdGF0ZSA9IGhpc3RvcnkucHVzaFN0YXRlO1xuICAgIGNvbnN0IG9yaWdSZXBsYWNlU3RhdGUgPSBoaXN0b3J5LnJlcGxhY2VTdGF0ZTtcbiAgICBoaXN0b3J5LnB1c2hTdGF0ZSA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICBvcmlnUHVzaFN0YXRlLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgY2hlY2tVcmxDaGFuZ2UoKTtcbiAgICB9O1xuICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgIG9yaWdSZXBsYWNlU3RhdGUuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICBjaGVja1VybENoYW5nZSgpO1xuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJwb3BzdGF0ZVwiLCBjaGVja1VybENoYW5nZSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgKCkgPT4ge1xuICAgICAgYnJvd3Nlci5zdG9yYWdlLmxvY2FsLnJlbW92ZShNTUJfS0VZKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgfSk7XG5cbiAgICAvLyBQb2xsIGZvciBVUkwgY2hhbmdlcyBvbmx5IHdoZW4gcGFnZSBpcyB2aXNpYmxlIChzYXZlcyBDUFUgb24gYmFja2dyb3VuZCB0YWJzKVxuICAgIGxldCB1cmxQb2xsSW50ZXJ2YWw6IFJldHVyblR5cGU8dHlwZW9mIHNldEludGVydmFsPiB8IG51bGwgPSBudWxsO1xuICAgIGNvbnN0IHN0YXJ0VXJsUG9sbCA9ICgpID0+IHtcbiAgICAgIGlmICh1cmxQb2xsSW50ZXJ2YWwpIHJldHVybjtcbiAgICAgIHVybFBvbGxJbnRlcnZhbCA9IHNldEludGVydmFsKGNoZWNrVXJsQ2hhbmdlLCAxMDAwKTtcbiAgICB9O1xuICAgIGNvbnN0IHN0b3BVcmxQb2xsID0gKCkgPT4ge1xuICAgICAgaWYgKHVybFBvbGxJbnRlcnZhbCkgeyBjbGVhckludGVydmFsKHVybFBvbGxJbnRlcnZhbCk7IHVybFBvbGxJbnRlcnZhbCA9IG51bGw7IH1cbiAgICB9O1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJ2aXNpYmlsaXR5Y2hhbmdlXCIsICgpID0+IHtcbiAgICAgIGlmIChkb2N1bWVudC5oaWRkZW4pIHN0b3BVcmxQb2xsKCk7IGVsc2Ugc3RhcnRVcmxQb2xsKCk7XG4gICAgfSk7XG4gICAgc3RhcnRVcmxQb2xsKCk7XG5cbiAgICAvLyAtLS0gQXN5bmMgY2hlY2tzIC0tLVxuXG4gICAgLy8gQ2hlY2sgYmFja2dyb3VuZCBmb3IgbW9kaWZpZXIgc3RhdGVcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDU7IGkrKykge1xuICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IGJyb3dzZXIucnVudGltZS5zZW5kTWVzc2FnZSh7IGFjdGlvbjogXCJnZXRNb2RpZmllclN0YXRlXCIgfSk7XG4gICAgICBpZiAocmVzcD8uY3RybEhlbGQpIHsgbmV3VGFiSW50ZW50ID0gdHJ1ZTsgYnJlYWs7IH1cbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzZXRUaW1lb3V0KHIsIDEwMCkpO1xuICAgIH1cblxuICAgIC8vIENoZWNrIHBlcnNpc3RlZCBtb2RpZmllciBzdGF0ZVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBtb2RTdG9yZWQgPSBhd2FpdCBicm93c2VyLnN0b3JhZ2UubG9jYWwuZ2V0KE1PRElGSUVSX0tFWSk7XG4gICAgICBjb25zdCBtb2RFbnRyeSA9IG1vZFN0b3JlZD8uW01PRElGSUVSX0tFWV07XG4gICAgICBpZiAobW9kRW50cnk/LnRzICYmIChEYXRlLm5vdygpIC0gbW9kRW50cnkudHMpIDwgTU9ESUZJRVJfVFRMKSB7XG4gICAgICAgIG5ld1RhYkludGVudCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKG1vZEVudHJ5KSB7XG4gICAgICAgIGJyb3dzZXIuc3RvcmFnZS5sb2NhbC5yZW1vdmUoTU9ESUZJRVJfS0VZKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7fVxuXG4gICAgLy8gQ2hlY2sgcGVyc2lzdGVkIE1NQiBzdGF0ZVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdG9yZWQgPSBhd2FpdCBicm93c2VyLnN0b3JhZ2UubG9jYWwuZ2V0KE1NQl9LRVkpO1xuICAgICAgY29uc3QgZW50cnkgPSBzdG9yZWQ/LltNTUJfS0VZXTtcbiAgICAgIGlmIChlbnRyeT8udXJsID09PSBsb2NhdGlvbi5ocmVmKSB7XG4gICAgICAgIG5ld1RhYkludGVudCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5KSB7XG4gICAgICAgIGJyb3dzZXIuc3RvcmFnZS5sb2NhbC5yZW1vdmUoTU1CX0tFWSkuY2F0Y2goKCkgPT4ge30pO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge31cblxuICAgIC8vIC0tLSBBdXRvLWZ1bGxzY3JlZW4gb24gaW5pdGlhbCBsb2FkIC0tLVxuICAgIGlmIChpc0VuYWJsZWQgJiYgYXV0b0Z1bGxzY3JlZW5FbmFibGVkICYmICFuZXdUYWJJbnRlbnQpIHtcbiAgICAgIGNvbnN0IG1haW5WaWRlbyA9IGZpbmRNYWluVmlkZW8oKTtcbiAgICAgIGlmIChtYWluVmlkZW8pIHtcbiAgICAgICAgbGFzdEZ1bGxzY3JlZW5lZFZpZGVvID0gbWFpblZpZGVvO1xuICAgICAgICBsYXN0RnVsbHNjcmVlbmVkVXJsID0gbWFpblZpZGVvLmN1cnJlbnRTcmMgfHwgbWFpblZpZGVvLnNyYyB8fCBcIlwiO1xuICAgICAgfVxuICAgICAgbGFzdEtub3duVXJsID0gbG9jYXRpb24uaHJlZjtcbiAgICAgIGRvRnVsbHNjcmVlbigpO1xuICAgIH1cblxuICAgIC8vIC0tLSBIaWRlIGZ1bGxzY3JlZW4gZXhpdCBpbnN0cnVjdGlvbnMgLS0tXG4gICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gICAgc3R5bGUudGV4dENvbnRlbnQgPSBgLkNocm9tZS1GdWxsLVNjcmVlbi1FeGl0LUluc3RydWN0aW9ue2Rpc3BsYXk6bm9uZSFpbXBvcnRhbnR9LkZ1bGwtU2NyZWVuLUV4aXQtSW5zdHJ1Y3Rpb257ZGlzcGxheTpub25lIWltcG9ydGFudH1gO1xuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuXG4gICAgLy8gLS0tIFNldHRpbmdzIHdhdGNoZXIgLS0tXG4gICAgbGV0IHNldHRpbmdzVGltZW91dDogUmV0dXJuVHlwZTx0eXBlb2Ygc2V0VGltZW91dD4gfCBudWxsID0gbnVsbDtcbiAgICBzdG9yZS53YXRjaCgobmV3VmFsdWUpID0+IHtcbiAgICAgIGlzRW5hYmxlZCA9IG5ld1ZhbHVlLmVuYWJsZWQ7XG4gICAgICBhdXRvRnVsbHNjcmVlbkVuYWJsZWQgPSBuZXdWYWx1ZS5hdXRvRnVsbHNjcmVlbkVuYWJsZWQ7XG4gICAgICBvbmVXYXlGdWxsc2NyZWVuID0gbmV3VmFsdWUub25lV2F5RnVsbHNjcmVlbjtcbiAgICAgIGF1dG9GdWxsc2NyZWVuT25OZXdWaWRlbyA9IG5ld1ZhbHVlLmF1dG9GdWxsc2NyZWVuT25OZXdWaWRlbztcbiAgICAgIHN0cmljdFNhZmV0eSA9IG5ld1ZhbHVlLnN0cmljdFNhZmV0eTtcbiAgICAgIGxvbmdQcmVzc0RlbGF5ID0gbmV3VmFsdWUubG9uZ1ByZXNzRGVsYXk7XG4gICAgICB0b3BFZGdlRXhpdEVuYWJsZWQgPSBuZXdWYWx1ZS50b3BFZGdlRXhpdEVuYWJsZWQ7XG4gICAgICByaXBwbGVFbmFibGVkID0gbmV3VmFsdWUucmlwcGxlRW5hYmxlZDtcbiAgICAgIHByaW1hcnlDb2xvciA9IG5ld1ZhbHVlLnByaW1hcnlDb2xvciB8fCBcIiMwMEZGRkZcIjtcbiAgICAgIGZ1bGxzY3JlZW5WaWRlbyA9IG5ld1ZhbHVlLmZ1bGxzY3JlZW5WaWRlbztcbiAgICAgIGlmICghaXNFbmFibGVkKSB7XG4gICAgICAgIGlmIChzZXR0aW5nc1RpbWVvdXQpIGNsZWFyVGltZW91dChzZXR0aW5nc1RpbWVvdXQpO1xuICAgICAgICBzZXR0aW5nc1RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyBhY3Rpb246IFwiZXhpdFdpbmRvd0Z1bGxzY3JlZW5cIiB9KTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbn0pO1xuIiwiZnVuY3Rpb24gcHJpbnQobWV0aG9kLCAuLi5hcmdzKSB7XG4gIGlmIChpbXBvcnQubWV0YS5lbnYuTU9ERSA9PT0gXCJwcm9kdWN0aW9uXCIpIHJldHVybjtcbiAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGFyZ3Muc2hpZnQoKTtcbiAgICBtZXRob2QoYFt3eHRdICR7bWVzc2FnZX1gLCAuLi5hcmdzKTtcbiAgfSBlbHNlIHtcbiAgICBtZXRob2QoXCJbd3h0XVwiLCAuLi5hcmdzKTtcbiAgfVxufVxuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IHtcbiAgZGVidWc6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmRlYnVnLCAuLi5hcmdzKSxcbiAgbG9nOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5sb2csIC4uLmFyZ3MpLFxuICB3YXJuOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS53YXJuLCAuLi5hcmdzKSxcbiAgZXJyb3I6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmVycm9yLCAuLi5hcmdzKVxufTtcbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmV4cG9ydCBjbGFzcyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IGV4dGVuZHMgRXZlbnQge1xuICBjb25zdHJ1Y3RvcihuZXdVcmwsIG9sZFVybCkge1xuICAgIHN1cGVyKFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQuRVZFTlRfTkFNRSwge30pO1xuICAgIHRoaXMubmV3VXJsID0gbmV3VXJsO1xuICAgIHRoaXMub2xkVXJsID0gb2xkVXJsO1xuICB9XG4gIHN0YXRpYyBFVkVOVF9OQU1FID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXF1ZUV2ZW50TmFtZShldmVudE5hbWUpIHtcbiAgcmV0dXJuIGAke2Jyb3dzZXI/LnJ1bnRpbWU/LmlkfToke2ltcG9ydC5tZXRhLmVudi5FTlRSWVBPSU5UfToke2V2ZW50TmFtZX1gO1xufVxuIiwiaW1wb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9jYXRpb25XYXRjaGVyKGN0eCkge1xuICBsZXQgaW50ZXJ2YWw7XG4gIGxldCBvbGRVcmw7XG4gIHJldHVybiB7XG4gICAgLyoqXG4gICAgICogRW5zdXJlIHRoZSBsb2NhdGlvbiB3YXRjaGVyIGlzIGFjdGl2ZWx5IGxvb2tpbmcgZm9yIFVSTCBjaGFuZ2VzLiBJZiBpdCdzIGFscmVhZHkgd2F0Y2hpbmcsXG4gICAgICogdGhpcyBpcyBhIG5vb3AuXG4gICAgICovXG4gICAgcnVuKCkge1xuICAgICAgaWYgKGludGVydmFsICE9IG51bGwpIHJldHVybjtcbiAgICAgIG9sZFVybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICBpbnRlcnZhbCA9IGN0eC5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGxldCBuZXdVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBpZiAobmV3VXJsLmhyZWYgIT09IG9sZFVybC5ocmVmKSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQobmV3VXJsLCBvbGRVcmwpKTtcbiAgICAgICAgICBvbGRVcmwgPSBuZXdVcmw7XG4gICAgICAgIH1cbiAgICAgIH0sIDFlMyk7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uLy4uL3NhbmRib3gvdXRpbHMvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHsgZ2V0VW5pcXVlRXZlbnROYW1lIH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmltcG9ydCB7IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlciB9IGZyb20gXCIuL2xvY2F0aW9uLXdhdGNoZXIubWpzXCI7XG5leHBvcnQgY2xhc3MgQ29udGVudFNjcmlwdENvbnRleHQge1xuICBjb25zdHJ1Y3Rvcihjb250ZW50U2NyaXB0TmFtZSwgb3B0aW9ucykge1xuICAgIHRoaXMuY29udGVudFNjcmlwdE5hbWUgPSBjb250ZW50U2NyaXB0TmFtZTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuYWJvcnRDb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGlmICh0aGlzLmlzVG9wRnJhbWUpIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKHsgaWdub3JlRmlyc3RFdmVudDogdHJ1ZSB9KTtcbiAgICAgIHRoaXMuc3RvcE9sZFNjcmlwdHMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoKTtcbiAgICB9XG4gIH1cbiAgc3RhdGljIFNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSA9IGdldFVuaXF1ZUV2ZW50TmFtZShcbiAgICBcInd4dDpjb250ZW50LXNjcmlwdC1zdGFydGVkXCJcbiAgKTtcbiAgaXNUb3BGcmFtZSA9IHdpbmRvdy5zZWxmID09PSB3aW5kb3cudG9wO1xuICBhYm9ydENvbnRyb2xsZXI7XG4gIGxvY2F0aW9uV2F0Y2hlciA9IGNyZWF0ZUxvY2F0aW9uV2F0Y2hlcih0aGlzKTtcbiAgcmVjZWl2ZWRNZXNzYWdlSWRzID0gLyogQF9fUFVSRV9fICovIG5ldyBTZXQoKTtcbiAgZ2V0IHNpZ25hbCgpIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuc2lnbmFsO1xuICB9XG4gIGFib3J0KHJlYXNvbikge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5hYm9ydChyZWFzb24pO1xuICB9XG4gIGdldCBpc0ludmFsaWQoKSB7XG4gICAgaWYgKGJyb3dzZXIucnVudGltZS5pZCA9PSBudWxsKSB7XG4gICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNpZ25hbC5hYm9ydGVkO1xuICB9XG4gIGdldCBpc1ZhbGlkKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0ludmFsaWQ7XG4gIH1cbiAgLyoqXG4gICAqIEFkZCBhIGxpc3RlbmVyIHRoYXQgaXMgY2FsbGVkIHdoZW4gdGhlIGNvbnRlbnQgc2NyaXB0J3MgY29udGV4dCBpcyBpbnZhbGlkYXRlZC5cbiAgICpcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byByZW1vdmUgdGhlIGxpc3RlbmVyLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGNiKTtcbiAgICogY29uc3QgcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lciA9IGN0eC5vbkludmFsaWRhdGVkKCgpID0+IHtcbiAgICogICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLnJlbW92ZUxpc3RlbmVyKGNiKTtcbiAgICogfSlcbiAgICogLy8gLi4uXG4gICAqIHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIoKTtcbiAgICovXG4gIG9uSW52YWxpZGF0ZWQoY2IpIHtcbiAgICB0aGlzLnNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLnNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgY2IpO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm4gYSBwcm9taXNlIHRoYXQgbmV2ZXIgcmVzb2x2ZXMuIFVzZWZ1bCBpZiB5b3UgaGF2ZSBhbiBhc3luYyBmdW5jdGlvbiB0aGF0IHNob3VsZG4ndCBydW5cbiAgICogYWZ0ZXIgdGhlIGNvbnRleHQgaXMgZXhwaXJlZC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgZ2V0VmFsdWVGcm9tU3RvcmFnZSA9IGFzeW5jICgpID0+IHtcbiAgICogICBpZiAoY3R4LmlzSW52YWxpZCkgcmV0dXJuIGN0eC5ibG9jaygpO1xuICAgKlxuICAgKiAgIC8vIC4uLlxuICAgKiB9XG4gICAqL1xuICBibG9jaygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKCkgPT4ge1xuICAgIH0pO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldEludGVydmFsYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKi9cbiAgc2V0SW50ZXJ2YWwoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuICAgIH0sIHRpbWVvdXQpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhckludGVydmFsKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnNldFRpbWVvdXRgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsIHdoZW4gaW52YWxpZGF0ZWQuXG4gICAqL1xuICBzZXRUaW1lb3V0KGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgaGFuZGxlcigpO1xuICAgIH0sIHRpbWVvdXQpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjbGVhclRpbWVvdXQoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG4gICAqIGludmFsaWRhdGVkLlxuICAgKi9cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxBbmltYXRpb25GcmFtZShpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0SWRsZUNhbGxiYWNrYCB0aGF0IGF1dG9tYXRpY2FsbHkgY2FuY2VscyB0aGUgcmVxdWVzdCB3aGVuXG4gICAqIGludmFsaWRhdGVkLlxuICAgKi9cbiAgcmVxdWVzdElkbGVDYWxsYmFjayhjYWxsYmFjaywgb3B0aW9ucykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdElkbGVDYWxsYmFjaygoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKCF0aGlzLnNpZ25hbC5hYm9ydGVkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9LCBvcHRpb25zKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsSWRsZUNhbGxiYWNrKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIGFkZEV2ZW50TGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGUgPT09IFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpIHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIHRoaXMubG9jYXRpb25XYXRjaGVyLnJ1bigpO1xuICAgIH1cbiAgICB0YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcj8uKFxuICAgICAgdHlwZS5zdGFydHNXaXRoKFwid3h0OlwiKSA/IGdldFVuaXF1ZUV2ZW50TmFtZSh0eXBlKSA6IHR5cGUsXG4gICAgICBoYW5kbGVyLFxuICAgICAge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBzaWduYWw6IHRoaXMuc2lnbmFsXG4gICAgICB9XG4gICAgKTtcbiAgfVxuICAvKipcbiAgICogQGludGVybmFsXG4gICAqIEFib3J0IHRoZSBhYm9ydCBjb250cm9sbGVyIGFuZCBleGVjdXRlIGFsbCBgb25JbnZhbGlkYXRlZGAgbGlzdGVuZXJzLlxuICAgKi9cbiAgbm90aWZ5SW52YWxpZGF0ZWQoKSB7XG4gICAgdGhpcy5hYm9ydChcIkNvbnRlbnQgc2NyaXB0IGNvbnRleHQgaW52YWxpZGF0ZWRcIik7XG4gICAgbG9nZ2VyLmRlYnVnKFxuICAgICAgYENvbnRlbnQgc2NyaXB0IFwiJHt0aGlzLmNvbnRlbnRTY3JpcHROYW1lfVwiIGNvbnRleHQgaW52YWxpZGF0ZWRgXG4gICAgKTtcbiAgfVxuICBzdG9wT2xkU2NyaXB0cygpIHtcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoXG4gICAgICB7XG4gICAgICAgIHR5cGU6IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRSxcbiAgICAgICAgY29udGVudFNjcmlwdE5hbWU6IHRoaXMuY29udGVudFNjcmlwdE5hbWUsXG4gICAgICAgIG1lc3NhZ2VJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMilcbiAgICAgIH0sXG4gICAgICBcIipcIlxuICAgICk7XG4gIH1cbiAgdmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSB7XG4gICAgY29uc3QgaXNTY3JpcHRTdGFydGVkRXZlbnQgPSBldmVudC5kYXRhPy50eXBlID09PSBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEU7XG4gICAgY29uc3QgaXNTYW1lQ29udGVudFNjcmlwdCA9IGV2ZW50LmRhdGE/LmNvbnRlbnRTY3JpcHROYW1lID09PSB0aGlzLmNvbnRlbnRTY3JpcHROYW1lO1xuICAgIGNvbnN0IGlzTm90RHVwbGljYXRlID0gIXRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmhhcyhldmVudC5kYXRhPy5tZXNzYWdlSWQpO1xuICAgIHJldHVybiBpc1NjcmlwdFN0YXJ0ZWRFdmVudCAmJiBpc1NhbWVDb250ZW50U2NyaXB0ICYmIGlzTm90RHVwbGljYXRlO1xuICB9XG4gIGxpc3RlbkZvck5ld2VyU2NyaXB0cyhvcHRpb25zKSB7XG4gICAgbGV0IGlzRmlyc3QgPSB0cnVlO1xuICAgIGNvbnN0IGNiID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAodGhpcy52ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZWRNZXNzYWdlSWRzLmFkZChldmVudC5kYXRhLm1lc3NhZ2VJZCk7XG4gICAgICAgIGNvbnN0IHdhc0ZpcnN0ID0gaXNGaXJzdDtcbiAgICAgICAgaXNGaXJzdCA9IGZhbHNlO1xuICAgICAgICBpZiAod2FzRmlyc3QgJiYgb3B0aW9ucz8uaWdub3JlRmlyc3RFdmVudCkgcmV0dXJuO1xuICAgICAgICB0aGlzLm5vdGlmeUludmFsaWRhdGVkKCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBhZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYik7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IHJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKSk7XG4gIH1cbn1cbiIsImNvbnN0IG51bGxLZXkgPSBTeW1ib2woJ251bGwnKTsgLy8gYG9iamVjdEhhc2hlc2Aga2V5IGZvciBudWxsXG5cbmxldCBrZXlDb3VudGVyID0gMDtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTWFueUtleXNNYXAgZXh0ZW5kcyBNYXAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5fb2JqZWN0SGFzaGVzID0gbmV3IFdlYWtNYXAoKTtcblx0XHR0aGlzLl9zeW1ib2xIYXNoZXMgPSBuZXcgTWFwKCk7IC8vIGh0dHBzOi8vZ2l0aHViLmNvbS90YzM5L2VjbWEyNjIvaXNzdWVzLzExOTRcblx0XHR0aGlzLl9wdWJsaWNLZXlzID0gbmV3IE1hcCgpO1xuXG5cdFx0Y29uc3QgW3BhaXJzXSA9IGFyZ3VtZW50czsgLy8gTWFwIGNvbXBhdFxuXHRcdGlmIChwYWlycyA9PT0gbnVsbCB8fCBwYWlycyA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBwYWlyc1tTeW1ib2wuaXRlcmF0b3JdICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKHR5cGVvZiBwYWlycyArICcgaXMgbm90IGl0ZXJhYmxlIChjYW5ub3QgcmVhZCBwcm9wZXJ0eSBTeW1ib2woU3ltYm9sLml0ZXJhdG9yKSknKTtcblx0XHR9XG5cblx0XHRmb3IgKGNvbnN0IFtrZXlzLCB2YWx1ZV0gb2YgcGFpcnMpIHtcblx0XHRcdHRoaXMuc2V0KGtleXMsIHZhbHVlKTtcblx0XHR9XG5cdH1cblxuXHRfZ2V0UHVibGljS2V5cyhrZXlzLCBjcmVhdGUgPSBmYWxzZSkge1xuXHRcdGlmICghQXJyYXkuaXNBcnJheShrZXlzKSkge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIGtleXMgcGFyYW1ldGVyIG11c3QgYmUgYW4gYXJyYXknKTtcblx0XHR9XG5cblx0XHRjb25zdCBwcml2YXRlS2V5ID0gdGhpcy5fZ2V0UHJpdmF0ZUtleShrZXlzLCBjcmVhdGUpO1xuXG5cdFx0bGV0IHB1YmxpY0tleTtcblx0XHRpZiAocHJpdmF0ZUtleSAmJiB0aGlzLl9wdWJsaWNLZXlzLmhhcyhwcml2YXRlS2V5KSkge1xuXHRcdFx0cHVibGljS2V5ID0gdGhpcy5fcHVibGljS2V5cy5nZXQocHJpdmF0ZUtleSk7XG5cdFx0fSBlbHNlIGlmIChjcmVhdGUpIHtcblx0XHRcdHB1YmxpY0tleSA9IFsuLi5rZXlzXTsgLy8gUmVnZW5lcmF0ZSBrZXlzIGFycmF5IHRvIGF2b2lkIGV4dGVybmFsIGludGVyYWN0aW9uXG5cdFx0XHR0aGlzLl9wdWJsaWNLZXlzLnNldChwcml2YXRlS2V5LCBwdWJsaWNLZXkpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7cHJpdmF0ZUtleSwgcHVibGljS2V5fTtcblx0fVxuXG5cdF9nZXRQcml2YXRlS2V5KGtleXMsIGNyZWF0ZSA9IGZhbHNlKSB7XG5cdFx0Y29uc3QgcHJpdmF0ZUtleXMgPSBbXTtcblx0XHRmb3IgKGxldCBrZXkgb2Yga2V5cykge1xuXHRcdFx0aWYgKGtleSA9PT0gbnVsbCkge1xuXHRcdFx0XHRrZXkgPSBudWxsS2V5O1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBoYXNoZXMgPSB0eXBlb2Yga2V5ID09PSAnb2JqZWN0JyB8fCB0eXBlb2Yga2V5ID09PSAnZnVuY3Rpb24nID8gJ19vYmplY3RIYXNoZXMnIDogKHR5cGVvZiBrZXkgPT09ICdzeW1ib2wnID8gJ19zeW1ib2xIYXNoZXMnIDogZmFsc2UpO1xuXG5cdFx0XHRpZiAoIWhhc2hlcykge1xuXHRcdFx0XHRwcml2YXRlS2V5cy5wdXNoKGtleSk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXNbaGFzaGVzXS5oYXMoa2V5KSkge1xuXHRcdFx0XHRwcml2YXRlS2V5cy5wdXNoKHRoaXNbaGFzaGVzXS5nZXQoa2V5KSk7XG5cdFx0XHR9IGVsc2UgaWYgKGNyZWF0ZSkge1xuXHRcdFx0XHRjb25zdCBwcml2YXRlS2V5ID0gYEBAbWttLXJlZi0ke2tleUNvdW50ZXIrK31AQGA7XG5cdFx0XHRcdHRoaXNbaGFzaGVzXS5zZXQoa2V5LCBwcml2YXRlS2V5KTtcblx0XHRcdFx0cHJpdmF0ZUtleXMucHVzaChwcml2YXRlS2V5KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkocHJpdmF0ZUtleXMpO1xuXHR9XG5cblx0c2V0KGtleXMsIHZhbHVlKSB7XG5cdFx0Y29uc3Qge3B1YmxpY0tleX0gPSB0aGlzLl9nZXRQdWJsaWNLZXlzKGtleXMsIHRydWUpO1xuXHRcdHJldHVybiBzdXBlci5zZXQocHVibGljS2V5LCB2YWx1ZSk7XG5cdH1cblxuXHRnZXQoa2V5cykge1xuXHRcdGNvbnN0IHtwdWJsaWNLZXl9ID0gdGhpcy5fZ2V0UHVibGljS2V5cyhrZXlzKTtcblx0XHRyZXR1cm4gc3VwZXIuZ2V0KHB1YmxpY0tleSk7XG5cdH1cblxuXHRoYXMoa2V5cykge1xuXHRcdGNvbnN0IHtwdWJsaWNLZXl9ID0gdGhpcy5fZ2V0UHVibGljS2V5cyhrZXlzKTtcblx0XHRyZXR1cm4gc3VwZXIuaGFzKHB1YmxpY0tleSk7XG5cdH1cblxuXHRkZWxldGUoa2V5cykge1xuXHRcdGNvbnN0IHtwdWJsaWNLZXksIHByaXZhdGVLZXl9ID0gdGhpcy5fZ2V0UHVibGljS2V5cyhrZXlzKTtcblx0XHRyZXR1cm4gQm9vbGVhbihwdWJsaWNLZXkgJiYgc3VwZXIuZGVsZXRlKHB1YmxpY0tleSkgJiYgdGhpcy5fcHVibGljS2V5cy5kZWxldGUocHJpdmF0ZUtleSkpO1xuXHR9XG5cblx0Y2xlYXIoKSB7XG5cdFx0c3VwZXIuY2xlYXIoKTtcblx0XHR0aGlzLl9zeW1ib2xIYXNoZXMuY2xlYXIoKTtcblx0XHR0aGlzLl9wdWJsaWNLZXlzLmNsZWFyKCk7XG5cdH1cblxuXHRnZXQgW1N5bWJvbC50b1N0cmluZ1RhZ10oKSB7XG5cdFx0cmV0dXJuICdNYW55S2V5c01hcCc7XG5cdH1cblxuXHRnZXQgc2l6ZSgpIHtcblx0XHRyZXR1cm4gc3VwZXIuc2l6ZTtcblx0fVxufVxuIiwiaW1wb3J0IE1hbnlLZXlzTWFwIGZyb20gJ21hbnkta2V5cy1tYXAnO1xuaW1wb3J0IHsgZGVmdSB9IGZyb20gJ2RlZnUnO1xuaW1wb3J0IHsgaXNFeGlzdCB9IGZyb20gJy4vZGV0ZWN0b3JzLm1qcyc7XG5cbmNvbnN0IGdldERlZmF1bHRPcHRpb25zID0gKCkgPT4gKHtcbiAgdGFyZ2V0OiBnbG9iYWxUaGlzLmRvY3VtZW50LFxuICB1bmlmeVByb2Nlc3M6IHRydWUsXG4gIGRldGVjdG9yOiBpc0V4aXN0LFxuICBvYnNlcnZlQ29uZmlnczoge1xuICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICBzdWJ0cmVlOiB0cnVlLFxuICAgIGF0dHJpYnV0ZXM6IHRydWVcbiAgfSxcbiAgc2lnbmFsOiB2b2lkIDAsXG4gIGN1c3RvbU1hdGNoZXI6IHZvaWQgMFxufSk7XG5jb25zdCBtZXJnZU9wdGlvbnMgPSAodXNlclNpZGVPcHRpb25zLCBkZWZhdWx0T3B0aW9ucykgPT4ge1xuICByZXR1cm4gZGVmdSh1c2VyU2lkZU9wdGlvbnMsIGRlZmF1bHRPcHRpb25zKTtcbn07XG5cbmNvbnN0IHVuaWZ5Q2FjaGUgPSBuZXcgTWFueUtleXNNYXAoKTtcbmZ1bmN0aW9uIGNyZWF0ZVdhaXRFbGVtZW50KGluc3RhbmNlT3B0aW9ucykge1xuICBjb25zdCB7IGRlZmF1bHRPcHRpb25zIH0gPSBpbnN0YW5jZU9wdGlvbnM7XG4gIHJldHVybiAoc2VsZWN0b3IsIG9wdGlvbnMpID0+IHtcbiAgICBjb25zdCB7XG4gICAgICB0YXJnZXQsXG4gICAgICB1bmlmeVByb2Nlc3MsXG4gICAgICBvYnNlcnZlQ29uZmlncyxcbiAgICAgIGRldGVjdG9yLFxuICAgICAgc2lnbmFsLFxuICAgICAgY3VzdG9tTWF0Y2hlclxuICAgIH0gPSBtZXJnZU9wdGlvbnMob3B0aW9ucywgZGVmYXVsdE9wdGlvbnMpO1xuICAgIGNvbnN0IHVuaWZ5UHJvbWlzZUtleSA9IFtcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgdGFyZ2V0LFxuICAgICAgdW5pZnlQcm9jZXNzLFxuICAgICAgb2JzZXJ2ZUNvbmZpZ3MsXG4gICAgICBkZXRlY3RvcixcbiAgICAgIHNpZ25hbCxcbiAgICAgIGN1c3RvbU1hdGNoZXJcbiAgICBdO1xuICAgIGNvbnN0IGNhY2hlZFByb21pc2UgPSB1bmlmeUNhY2hlLmdldCh1bmlmeVByb21pc2VLZXkpO1xuICAgIGlmICh1bmlmeVByb2Nlc3MgJiYgY2FjaGVkUHJvbWlzZSkge1xuICAgICAgcmV0dXJuIGNhY2hlZFByb21pc2U7XG4gICAgfVxuICAgIGNvbnN0IGRldGVjdFByb21pc2UgPSBuZXcgUHJvbWlzZShcbiAgICAgIC8vIGJpb21lLWlnbm9yZSBsaW50L3N1c3BpY2lvdXMvbm9Bc3luY1Byb21pc2VFeGVjdXRvcjogYXZvaWQgbmVzdGluZyBwcm9taXNlXG4gICAgICBhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGlmIChzaWduYWw/LmFib3J0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KHNpZ25hbC5yZWFzb24pO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoXG4gICAgICAgICAgYXN5bmMgKG11dGF0aW9ucykgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBfIG9mIG11dGF0aW9ucykge1xuICAgICAgICAgICAgICBpZiAoc2lnbmFsPy5hYm9ydGVkKSB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IGRldGVjdFJlc3VsdDIgPSBhd2FpdCBkZXRlY3RFbGVtZW50KHtcbiAgICAgICAgICAgICAgICBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgICAgICAgZGV0ZWN0b3IsXG4gICAgICAgICAgICAgICAgY3VzdG9tTWF0Y2hlclxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgaWYgKGRldGVjdFJlc3VsdDIuaXNEZXRlY3RlZCkge1xuICAgICAgICAgICAgICAgIG9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRldGVjdFJlc3VsdDIucmVzdWx0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgc2lnbmFsPy5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgICAgIFwiYWJvcnRcIixcbiAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KHNpZ25hbC5yZWFzb24pO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgeyBvbmNlOiB0cnVlIH1cbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgZGV0ZWN0UmVzdWx0ID0gYXdhaXQgZGV0ZWN0RWxlbWVudCh7XG4gICAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgIGRldGVjdG9yLFxuICAgICAgICAgIGN1c3RvbU1hdGNoZXJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChkZXRlY3RSZXN1bHQuaXNEZXRlY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZXNvbHZlKGRldGVjdFJlc3VsdC5yZXN1bHQpO1xuICAgICAgICB9XG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUodGFyZ2V0LCBvYnNlcnZlQ29uZmlncyk7XG4gICAgICB9XG4gICAgKS5maW5hbGx5KCgpID0+IHtcbiAgICAgIHVuaWZ5Q2FjaGUuZGVsZXRlKHVuaWZ5UHJvbWlzZUtleSk7XG4gICAgfSk7XG4gICAgdW5pZnlDYWNoZS5zZXQodW5pZnlQcm9taXNlS2V5LCBkZXRlY3RQcm9taXNlKTtcbiAgICByZXR1cm4gZGV0ZWN0UHJvbWlzZTtcbiAgfTtcbn1cbmFzeW5jIGZ1bmN0aW9uIGRldGVjdEVsZW1lbnQoe1xuICB0YXJnZXQsXG4gIHNlbGVjdG9yLFxuICBkZXRlY3RvcixcbiAgY3VzdG9tTWF0Y2hlclxufSkge1xuICBjb25zdCBlbGVtZW50ID0gY3VzdG9tTWF0Y2hlciA/IGN1c3RvbU1hdGNoZXIoc2VsZWN0b3IpIDogdGFyZ2V0LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICByZXR1cm4gYXdhaXQgZGV0ZWN0b3IoZWxlbWVudCk7XG59XG5jb25zdCB3YWl0RWxlbWVudCA9IGNyZWF0ZVdhaXRFbGVtZW50KHtcbiAgZGVmYXVsdE9wdGlvbnM6IGdldERlZmF1bHRPcHRpb25zKClcbn0pO1xuXG5leHBvcnQgeyBjcmVhdGVXYWl0RWxlbWVudCwgZ2V0RGVmYXVsdE9wdGlvbnMsIHdhaXRFbGVtZW50IH07XG4iXSwibmFtZXMiOlsiYnJvd3NlciIsInJlc3VsdCIsImtleXMiLCJfYSIsIm9wdHMiLCJtYXAiLCJkZWZpbml0aW9uIiwicHJpbnQiLCJsb2dnZXIiLCJfYiIsIl9jIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBTyxRQUFNQTtBQUFBQTtBQUFBQSxNQUVYLHNCQUFXLFlBQVgsbUJBQW9CLFlBQXBCLG1CQUE2QixPQUFNLE9BQU8sV0FBVztBQUFBO0FBQUEsTUFFbkQsV0FBVztBQUFBO0FBQUE7QUNIUixRQUFNLFlBQVUsc0JBQVcsWUFBWCxtQkFBb0IsWUFBcEIsbUJBQTZCLE1BQ2hELFdBQVcsVUFDWCxXQUFXO0FDRGYsUUFB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LGVBQWUsTUFBTSxJQUFJO0FBQ2xELGFBQU8sTUFBTSxJQUFJLFdBQVcsS0FBSztBQUFBLElBQ2xDO0FBQUEsSUFFQSxJQUFJLE1BQU07QUFDVCxZQUFNLEVBQUMsVUFBUyxJQUFJLEtBQUssZUFBZSxJQUFJO0FBQzVDLGFBQU8sTUFBTSxJQUFJLFNBQVM7QUFBQSxJQUMzQjtBQUFBLElBRUEsSUFBSSxNQUFNO0FBQ1QsWUFBTSxFQUFDLFVBQVMsSUFBSSxLQUFLLGVBQWUsSUFBSTtBQUM1QyxhQUFPLE1BQU0sSUFBSSxTQUFTO0FBQUEsSUFDM0I7QUFBQSxJQUVBLE9BQU8sTUFBTTtBQUNaLFlBQU0sRUFBQyxXQUFXLFdBQVUsSUFBSSxLQUFLLGVBQWUsSUFBSTtBQUN4RCxhQUFPLFFBQVEsYUFBYSxNQUFNLE9BQU8sU0FBUyxLQUFLLEtBQUssWUFBWSxPQUFPLFVBQVUsQ0FBQztBQUFBLElBQzNGO0FBQUEsSUFFQSxRQUFRO0FBQ1AsWUFBTSxNQUFLO0FBQ1gsV0FBSyxjQUFjLE1BQUs7QUFDeEIsV0FBSyxZQUFZLE1BQUs7QUFBQSxJQUN2QjtBQUFBLElBRUEsS0FBSyxPQUFPLFdBQVcsSUFBSTtBQUMxQixhQUFPO0FBQUEsSUFDUjtBQUFBLElBRUEsSUFBSSxPQUFPO0FBQ1YsYUFBTyxNQUFNO0FBQUEsSUFDZDtBQUFBLEVBQ0Q7QUNsRm1CLE1BQUksWUFBVzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDEsMiwzLDQsNiw4LDksMTAsMTEsMTIsMTNdfQ==
