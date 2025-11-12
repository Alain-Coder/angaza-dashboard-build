export interface FinanceRequest {
  id: string
  requesterId: string
  requesterName: string
  requesterRole: string
  amount: number
  currency: string
  purpose: string
  project?: string
  department: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  createdAt: Date
  updatedAt: Date
  approvedBy?: string
  approvedAt?: Date
  rejectionReason?: string
}

export interface Liquidation {
  id: string
  requestId: string
  requesterId: string
  requesterName: string
  requesterRole: string
  amount: number
  currency: string
  purpose: string
  receipts: Receipt[]
  status: 'pending' | 'submitted' | 'under-review' | 'approved' | 'rejected' | 'completed'
  createdAt: Date
  updatedAt: Date
  submittedAt?: Date
  reviewedBy?: string
  reviewedAt?: Date
  approvedBy?: string
  approvedAt?: Date
  rejectionReason?: string
}

export interface Receipt {
  id: string
  name: string
  amount: number
  date: Date
  description: string
  fileUrl?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
}

export const financeRoles = [
  'executive director',
  'finance lead',
  'programs lead',
  'project officer',
  'office assistant'
] as const

export type FinanceRole = typeof financeRoles[number]