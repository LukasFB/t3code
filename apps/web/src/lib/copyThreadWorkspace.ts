import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { ScopedThreadRef } from "@t3tools/contracts";
import type { OpenPreviewMutation } from "../browser/openFileInPreview";
import { readThreadPreviewState } from "../previewStateStore";
import { useRightPanelStore } from "../rightPanelStore";
import { useTerminalUiStateStore } from "../terminalUiStateStore";
import { openPreviewSession } from "../components/preview/openPreviewSession";

export async function copyThreadWorkspace<E>(
  source: ScopedThreadRef,
  target: ScopedThreadRef,
  openPreview: OpenPreviewMutation<E>,
) {
  const sourceKey = scopedThreadKey(source);
  const targetKey = scopedThreadKey(target);
  const panels = useRightPanelStore.getState();
  const sourcePanel = panels.byThreadKey[sourceKey];
  const visibility = panels.threadPanelVisibilityByThreadKey[sourceKey];
  const terminal = useTerminalUiStateStore.getState().terminalUiStateByThreadKey[sourceKey];
  if (terminal)
    useTerminalUiStateStore.setState((state) => ({
      terminalUiStateByThreadKey: {
        ...state.terminalUiStateByThreadKey,
        [targetKey]: structuredClone(terminal),
      },
    }));
  if (sourcePanel)
    useRightPanelStore.setState((state) => ({
      byThreadKey: {
        ...state.byThreadKey,
        [targetKey]: {
          ...structuredClone(sourcePanel),
          surfaces: sourcePanel.surfaces.filter(
            (surface) => surface.kind !== "preview" && surface.kind !== "device",
          ),
          activeSurfaceId:
            sourcePanel.surfaces.find(
              (surface) => surface.kind !== "preview" && surface.kind !== "device",
            )?.id ?? null,
        },
      },
      threadPanelVisibilityByThreadKey: {
        ...state.threadPanelVisibilityByThreadKey,
        ...(visibility ? { [targetKey]: { ...visibility } } : {}),
      },
    }));
  const previews = readThreadPreviewState(source);
  const restoredIds = new Map<string, string>();
  for (const surface of sourcePanel?.surfaces ?? []) {
    if (surface.kind !== "preview" || !surface.resourceId) continue;
    const snapshot = previews.sessions[surface.resourceId];
    if (!snapshot) continue;
    const result = await openPreviewSession({
      openPreview,
      threadRef: target,
      ...(snapshot.navStatus._tag === "Idle" ? {} : { url: snapshot.navStatus.url }),
      ...(snapshot.profileId === undefined ? {} : { profileId: snapshot.profileId }),
      ...(snapshot.viewport === undefined ? {} : { viewport: snapshot.viewport }),
      ...(snapshot.runtime === undefined ? {} : { runtime: snapshot.runtime }),
    });
    if (result._tag === "Failure")
      throw new Error("The new thread was created, but a browser tab could not be restored.");
    useRightPanelStore.getState().openBrowser(target, result.value.tabId);
    restoredIds.set(surface.id, `browser:${result.value.tabId}`);
  }
  if (sourcePanel?.activeSurfaceId) {
    const activeId = restoredIds.get(sourcePanel.activeSurfaceId) ?? sourcePanel.activeSurfaceId;
    useRightPanelStore.getState().activateSurface(target, activeId);
  }
  if (sourcePanel && !sourcePanel.isOpen) useRightPanelStore.getState().close(target);
}
