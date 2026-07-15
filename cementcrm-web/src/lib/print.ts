export function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    alert("Could not open the print preview.");
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // document.write/close run synchronously, so waiting on the iframe's
  // `load` event is unreliable across browsers -- a short delay lets the
  // logo image paint before invoking print. Printing via a hidden iframe
  // (instead of window.open) also avoids pop-up blockers entirely.
  setTimeout(() => {
    const win = iframe.contentWindow;
    win?.focus();
    win?.print();
    setTimeout(cleanup, 1000);
  }, 300);
}
