/** Save text as a file on the visitor's device. Nothing is uploaded anywhere. */
export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readFileText(file: File, maxBytes = 2_000_000): Promise<string> {
  if (file.size > maxBytes) return Promise.reject(new Error('That file is too large to be an UNSUBSCRIBE backup.'));
  return file.text();
}
