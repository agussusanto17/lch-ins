"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import {
  accessLevel as checkAccessLevel,
  canAccess as checkCanAccess,
  canManage as checkCanManage,
  type AccessLevel,
} from "@/lib/access"

interface PermissionContextValue {
  roles: string[]
  canManage: (path?: string) => boolean
  canAccess: (path?: string) => boolean
  accessLevel: (path?: string) => AccessLevel
}

const PermissionContext = React.createContext<PermissionContextValue | null>(null)

export function PermissionProvider({
  roles,
  children,
}: {
  roles: string[]
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const canManage = React.useCallback(
    (targetPath?: string) => {
      const p = targetPath ?? pathname
      return checkCanManage(roles, p)
    },
    [roles, pathname]
  )

  const canAccess = React.useCallback(
    (targetPath?: string) => {
      const p = targetPath ?? pathname
      return checkCanAccess(roles, p)
    },
    [roles, pathname]
  )

  const accessLevel = React.useCallback(
    (targetPath?: string) => {
      const p = targetPath ?? pathname
      return checkAccessLevel(roles, p)
    },
    [roles, pathname]
  )

  const value = React.useMemo(
    () => ({ roles, canManage, canAccess, accessLevel }),
    [roles, canManage, canAccess, accessLevel]
  )

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermission() {
  const ctx = React.useContext(PermissionContext)
  if (!ctx) {
    throw new Error("usePermission must be used within a PermissionProvider")
  }
  return ctx
}
