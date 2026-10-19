"use server"

import { revalidatePath } from "next/cache"

import {
  createUser,
  resetUserPassword,
  toggleUserStatus,
  updateUser,
  type UserSummary,
} from "@/lib/server/users"

export interface ActionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export async function createUserAction(
  _prevState: ActionResponse<{ user: UserSummary; temporaryPassword: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ user: UserSummary; temporaryPassword: string }>> {
  try {
    const name = formData.get("name")?.toString() ?? ""
    const email = formData.get("email")?.toString() ?? ""
    const jobTitle = formData.get("jobTitle")?.toString() ?? ""
    const roles = formData.getAll("roles").map((r) => r.toString())

    const result = await createUser({
      name,
      email,
      roles,
      jobTitle: jobTitle || null,
      isActive: true,
    })

    revalidatePath("/users")
    return { ok: true, data: result }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal menambahkan pengguna baru."
    return { ok: false, error: message }
  }
}

export async function updateUserAction(
  _prevState: ActionResponse<UserSummary> | null,
  formData: FormData
): Promise<ActionResponse<UserSummary>> {
  try {
    const id = formData.get("id")?.toString() ?? ""
    const name = formData.get("name")?.toString() ?? ""
    const email = formData.get("email")?.toString() ?? ""
    const jobTitle = formData.get("jobTitle")?.toString() ?? ""
    const roles = formData.getAll("roles").map((r) => r.toString())
    const isActive = formData.get("isActive") === "true"

    if (!id) {
      return { ok: false, error: "ID pengguna tidak ditemukan." }
    }

    const updated = await updateUser(id, {
      name,
      email,
      roles,
      jobTitle: jobTitle || null,
      isActive,
    })

    revalidatePath("/users")
    return { ok: true, data: updated }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui pengguna."
    return { ok: false, error: message }
  }
}

export async function toggleUserStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<UserSummary>> {
  try {
    const updated = await toggleUserStatus(id, isActive)
    revalidatePath("/users")
    return { ok: true, data: updated }
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Gagal mengubah status aktif pengguna."
    return { ok: false, error: message }
  }
}

export async function resetUserPasswordAction(
  id: string
): Promise<ActionResponse<{ temporaryPassword: string }>> {
  try {
    const res = await resetUserPassword(id)
    revalidatePath("/users")
    return { ok: true, data: res }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal mereset kata sandi."
    return { ok: false, error: message }
  }
}
