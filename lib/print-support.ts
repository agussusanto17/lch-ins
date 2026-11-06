/**
 * Apakah browser mengulang header dan footer cetak di setiap halaman.
 * Engine WebKit (Safari, dan semua browser di iOS) mencetak elemen fixed
 * hanya sekali dan tidak mengulang thead/tfoot; Chromium dan Firefox
 * mengulangnya.
 */
export function repeatsPrintHeaderFooter(userAgent: string) {
  const webkitOnly =
    /AppleWebKit\//.test(userAgent) && !/(Chrome|Chromium)\//.test(userAgent)
  return !webkitOnly
}
