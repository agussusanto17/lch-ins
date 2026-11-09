/**
 * Isi dokumen yang masih dimuat sebelum siap dicetak, misalnya halaman PDF
 * lampiran yang dirender di browser. Tombol cetak menunggu sampai kosong.
 */
let pending = 0
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/** Tandai satu isi mulai dimuat; panggil fungsi kembaliannya saat selesai. */
export function beginPrintTask() {
  pending += 1
  emit()
  let done = false
  return () => {
    if (done) return
    done = true
    pending -= 1
    emit()
  }
}

export function subscribePrintTasks(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function pendingPrintTasks() {
  return pending
}
