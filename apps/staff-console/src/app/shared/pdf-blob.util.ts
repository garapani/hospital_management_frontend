/**
 * Opens a PDF blob (a label, report, or export fetched via `ApiClientService.getBlob()`) in a new
 * tab as an object URL, so the browser's own viewer handles printing (Ctrl+P) — not a forced
 * download, since these documents are meant to be printed or read, not saved.
 */
export function openPdfBlobInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Revoking immediately would race the new tab's fetch of the blob URL on some browsers; a short
  // delay is enough since the tab reads it synchronously on open.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
