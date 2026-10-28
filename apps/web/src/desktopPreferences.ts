import * as Schema from "effect/Schema";
import { getLocalStorageItem, useLocalStorage } from "./hooks/useLocalStorage";

const DesktopPreferences = Schema.Struct({
  notificationVolume: Schema.Number,
  completionSound: Schema.Boolean,
  inputSound: Schema.Boolean,
  terminalFullWidth: Schema.Boolean,
  promptSuggestions: Schema.Boolean,
});
const defaults = {
  notificationVolume: 0.65,
  completionSound: true,
  inputSound: true,
  terminalFullWidth: false,
  promptSuggestions: true,
};
const key = "t3code:desktop-preferences";
export function useDesktopPreferences() {
  return useLocalStorage(key, defaults, DesktopPreferences);
}
export function readDesktopPreferences() {
  try {
    return getLocalStorageItem(key, DesktopPreferences) ?? defaults;
  } catch {
    return defaults;
  }
}
