export function printHtml(html: string) {
  const win = window.open("", "_blank", "width=850,height=1100");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}
