export interface TopbarPolicyItem {
  id: string
  policyNo: string
  insuredName: string
  expiryDate: string
}

export interface TopbarClaimItem {
  id: string
  claimNo: string
  insuredName: string
  lossDate: string
}

export interface TopbarSlipItem {
  id: string
  slipNo: string | null
  insuredName: string
  date?: string
}

export interface TopbarData {
  expiringPolicies: TopbarPolicyItem[]
  openClaims: TopbarClaimItem[]
  draftSlips: TopbarSlipItem[]
  recentSlips: TopbarSlipItem[]
}
