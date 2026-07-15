export function printHtml(html: string) {
  const win = window.open("", "_blank", "width=850,height=1100");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site and try again.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // document.write/close run synchronously, so `load` may already have
  // fired by the time we could attach a listener for it -- a short delay
  // is the reliable cross-browser way to let images (the logo) paint
  // before invoking print.
  setTimeout(() => {
    win.print();
  }, 300);
}
