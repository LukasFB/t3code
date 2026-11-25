import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import * as Schema from "effect/Schema";

const SOUND_SECONDS = 0.6;

const audio = { currentTime: 0, started: 0, volumes: [] as number[] };

class FakeAudioContext {
  state = "running";
  destination = {};
  get currentTime() {
    return audio.currentTime;
  }
  resume() {
    return Promise.resolve();
  }
  decodeAudioData() {
    return Promise.resolve({ duration: SOUND_SECONDS });
  }
  createGain() {
    return {
      gain: { value: 1 },
      connect() {
        audio.volumes.push(this.gain.value);
      },
      disconnect() {},
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect() {},
      disconnect() {},
      start() {
        audio.started += 1;
      },
    };
  }
}

async function loadUnlocked() {
  const notifications = await import("./threadNotifications");
  notifications.unlockNotificationAudio();
  return notifications;
}

beforeEach(() => {
  vi.resetModules();
  audio.currentTime = 0;
  audio.started = 0;
  audio.volumes = [];
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(0) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("playNotificationSound", () => {
  it("preloads both sounds on unlock and reuses them for playback", async () => {
    const { unlockNotificationAudio, playNotificationSound } = await loadUnlocked();
    expect(fetch).toHaveBeenCalledTimes(2);
    unlockNotificationAudio();
    await playNotificationSound("completion", () => true);
    await playNotificationSound("input", () => true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(audio.started).toBe(2);
  });

  it("retries failed preloads on an alert rather than every gesture", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    const { unlockNotificationAudio, playNotificationSound } = await loadUnlocked();
    await playNotificationSound("completion", () => true);
    expect(fetch).toHaveBeenCalledTimes(2);

    unlockNotificationAudio();
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.mocked(fetch).mockResolvedValue(new Response(new ArrayBuffer(0)));
    await playNotificationSound("completion", () => true);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(audio.started).toBe(1);
  });

  it("plays one sound for threads that complete together", async () => {
    const { playNotificationSound } = await loadUnlocked();

    await Promise.all(
      Array.from({ length: 4 }, () => playNotificationSound("completion", () => true)),
    );

    expect(audio.started).toBe(1);
    expect(audio.volumes).toEqual([0.65]);
  });

  it("still plays an input alert over a completion sound", async () => {
    const { playNotificationSound } = await loadUnlocked();
    await playNotificationSound("completion", () => true);

    await playNotificationSound("input", () => true);

    expect(audio.started).toBe(2);
  });

  it("leaves the slot free when a sound is turned off before it plays", async () => {
    const { playNotificationSound } = await loadUnlocked();
    await playNotificationSound("completion", () => false);

    const { setLocalStorageItem } = await import("./hooks/useLocalStorage");
    const preferences = {
      notificationVolume: 0.25,
      completionSound: false,
      inputSound: false,
      terminalFullWidth: false,
    };
    setLocalStorageItem("t3code:desktop-preferences", preferences, Schema.Unknown);
    await playNotificationSound("completion", () => true);
    await playNotificationSound("input", () => true);
    expect(audio.started).toBe(0);

    setLocalStorageItem(
      "t3code:desktop-preferences",
      { ...preferences, completionSound: true },
      Schema.Unknown,
    );

    await playNotificationSound("completion", () => true);

    expect(audio.started).toBe(1);
    expect(audio.volumes).toEqual([0.25]);
    await playNotificationSound("input", () => true, true);
    expect(audio.started).toBe(2);
  });
});
