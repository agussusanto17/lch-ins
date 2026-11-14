/**
 * Apakah browser mengulang header dan footer cetak di setiap halaman.
 * WebKit (Safari, semua browser iOS) tidak mengulang elemen fixed maupun thead/tfoot.
 */
export function repeatsPrintHeaderFooter(userAgent: string) {
  const webkitOnly =
    /AppleWebKit\//.test(userAgent) && !/(Chrome|Chromium)\//.test(userAgent)
  return !webkitOnly
}
