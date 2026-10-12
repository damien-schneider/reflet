import { afterEach, describe, expect, it, vi } from "vitest";
import { installFakeAudio } from "../../testing/fake-audio";
import { MicrophoneError, openMicrophone } from "./microphone";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openMicrophone", () => {
  it("asks for a mono voice track with speech processing", async () => {
    const audio = installFakeAudio();
    const microphone = await openMicrophone({ onFrame: vi.fn() });
    expect(audio.getUserMedia).toHaveBeenCalledWith({
      audio: {
        autoGainControl: true,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    microphone.stop();
  });

  it.each([
    ["NotAllowedError", "mic_denied"],
    ["SecurityError", "mic_denied"],
    ["NotFoundError", "mic_unavailable"],
    ["OverconstrainedError", "mic_unavailable"],
  ])("maps %s to %s without opening an audio context", async (name, kind) => {
    const audio = installFakeAudio({ denyWith: name });
    const opening = openMicrophone({ onFrame: vi.fn() });
    await expect(opening).rejects.toBeInstanceOf(MicrophoneError);
    await expect(opening).rejects.toMatchObject({ kind });
    expect(audio.contexts).toHaveLength(0);
  });

  it("blames the site's Permissions-Policy when it disallows the microphone", async () => {
    installFakeAudio({ denyWith: "NotAllowedError" });
    Object.defineProperty(document, "featurePolicy", {
      configurable: true,
      value: { allowsFeature: (feature: string) => feature !== "microphone" },
    });
    const opening = openMicrophone({ onFrame: vi.fn() });
    await expect(opening).rejects.toMatchObject({
      kind: "mic_blocked_by_site",
    });
    Reflect.deleteProperty(document, "featurePolicy");
  });

  it("explains an insecure page", async () => {
    installFakeAudio();
    vi.stubGlobal("isSecureContext", false);
    await expect(openMicrophone({ onFrame: vi.fn() })).rejects.toMatchObject({
      kind: "insecure_context",
    });
  });

  it("explains a browser without media devices", async () => {
    installFakeAudio();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });
    await expect(openMicrophone({ onFrame: vi.fn() })).rejects.toMatchObject({
      kind: "insecure_context",
    });
  });

  it("forwards worklet frames", async () => {
    const audio = installFakeAudio();
    const onFrame = vi.fn();
    const microphone = await openMicrophone({ onFrame });
    audio.emitFrame(new Float32Array(4));
    expect(onFrame).toHaveBeenCalledWith(new Float32Array(4));
    expect(audio.processors).toHaveLength(0);
    microphone.stop();
  });

  it("falls back to a script processor when the worklet is blocked", async () => {
    const audio = installFakeAudio({ workletFails: true });
    const onFrame = vi.fn();
    const microphone = await openMicrophone({ onFrame });
    audio.emitFrame(new Float32Array(8));
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(audio.workletNodes).toHaveLength(0);
    microphone.stop();
  });

  it("releases the tracks, the context and the module URL on stop", async () => {
    const audio = installFakeAudio();
    const onFrame = vi.fn();
    const microphone = await openMicrophone({ onFrame });
    microphone.stop();
    for (const track of audio.tracks) {
      expect(track.stop).toHaveBeenCalled();
    }
    expect(audio.contexts[0]?.close).toHaveBeenCalled();
    expect(audio.revokeObjectURL).toHaveBeenCalledWith("blob:reflet-worklet");
    audio.emitFrame(new Float32Array(4));
    expect(onFrame).not.toHaveBeenCalled();
  });
});
