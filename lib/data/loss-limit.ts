/**
 * Skala premi polis loss limit OJK (SE OJK 6/SEOJK.05/2017): Lampiran I
 * Tabel I.B untuk FLEXAS, sama persis dengan Tabel II.C (banjir) dan Tabel
 * III.B (gempa bumi). Pasangan [% nilai penuh, % premi full value], urut
 * menurun. Salinan yang sama ada di tabel loss_limit_scales (Master Data >
 * Tarif Baku OJK); keduanya harus tetap identik.
 */
export const LOSS_LIMIT_SCALE: readonly (readonly [number, number])[] = [
  [100, 100], [99, 99.6], [98, 99.2], [97, 98.8], [96, 98.4], [95, 98],
  [94, 97.6], [93, 97.2], [92, 96.8], [91, 96.4], [90, 96], [89, 95.6],
  [88, 95.2], [87, 94.8], [86, 94.4], [85, 94], [84, 93.6], [83, 93.2],
  [82, 92.8], [81, 92.4], [80, 92], [79, 91.6], [78, 91.2], [77, 90.8],
  [76, 90.4], [75, 90], [74, 89.8], [73, 89.6], [72, 89.4], [71, 89.2],
  [70, 89], [69, 88.8], [68, 88.6], [67, 88.4], [66, 88.2], [65, 88],
  [64, 87.8], [63, 87.6], [62, 87.4], [61, 87.2], [60, 87], [59, 86.8],
  [58, 86.6], [57, 86.4], [56, 86.2], [55, 86], [54, 85.8], [53, 85.6],
  [52, 85.4], [51, 85.2], [50, 85], [49, 84.7], [48, 84.46], [47, 84.21],
  [46, 83.9], [45, 83.6], [44, 83.3], [43, 83], [42, 82.8], [41, 82.53],
  [40, 82.2], [39, 81.87], [38, 81.54], [37, 81.21], [36, 80.88], [35, 80.55],
  [34, 80.22], [33, 80], [32, 79.37], [31, 78.75], [30, 78.12], [29, 77.5],
  [28, 76.87], [27, 76.25], [26, 75.62], [25, 75], [24, 74], [23, 73],
  [22, 72], [21, 71], [20, 70], [19, 69], [18, 68], [17, 67],
  [16, 66], [15, 65], [14, 64], [13, 63], [12, 62], [11, 61],
  [10, 60], [9, 58], [8, 56], [7.5, 55], [7, 54], [6, 52],
  [5, 50], [4.9, 49.5], [4.8, 49], [4.7, 48.5], [4.6, 48], [4.5, 47.5],
  [4.4, 47], [4.3, 46.5], [4.2, 46], [4.1, 45.5], [4, 45], [3.9, 44.5],
  [3.8, 44], [3.7, 43.5], [3.6, 43], [3.5, 42.5], [3.4, 42], [3.3, 41.5],
  [3.2, 41], [3.1, 40.5], [3, 40], [2.9, 39.75], [2.8, 39.5], [2.7, 39.25],
  [2.6, 39], [2.5, 38.75], [2.4, 38.5], [2.3, 38.25], [2.2, 38], [2.1, 37.75],
  [2, 37.5], [1.9, 37], [1.8, 36.5], [1.7, 36], [1.6, 35.5], [1.5, 35],
  [1.4, 34.5], [1.3, 34], [1.2, 33.5], [1.1, 33], [1, 32.5],
]

/**
 * Persen premi full value untuk loss limit sebesar `valuesPct` persen dari
 * nilai penuh. Persentase di antara baris memakai baris berikutnya ke atas
 * supaya premi tidak kurang; 100% ke atas berarti full value.
 */
export function lossLimitPremiumPct(valuesPct: number): number {
  if (!(valuesPct > 0)) return 100
  const pct = Math.round(valuesPct * 100) / 100
  if (pct >= 100) return 100
  let premium = 100
  for (const [values, rowPremium] of LOSS_LIMIT_SCALE) {
    if (values < pct) break
    premium = rowPremium
  }
  return premium
}
