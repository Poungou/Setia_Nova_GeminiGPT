// src/admin/useAdmin.js
import { createContext, useContext } from 'react'

export const AdminCtx = createContext(null)

export function useAdmin() {
  const ctx = useContext(AdminCtx)
  if (!ctx) throw new Error('useAdmin() hors de <AdminProvider>')
  return ctx
}
