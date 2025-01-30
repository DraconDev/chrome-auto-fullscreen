// Background script no longer needed - functionality handled by content script and popup
// Listen for keyboard command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle_enabled") {
    const currentState = await store.getValue();
    await store.setValue({
      ...currentState,
      enabled: !currentState.enabled,
    });
  }
});
