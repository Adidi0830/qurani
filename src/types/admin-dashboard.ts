export type DashboardCountItem = {
  name: string
  value: number
}

export type AdminDashboardSummary = {
  cards: {
    totalUsers: number
    totalAdmins: number
    activeUsers: number
    blockedUsers: number
  }
  charts: {
    topCountries: DashboardCountItem[]
    topStates: DashboardCountItem[]
    topCities: DashboardCountItem[]
    genderCounts: DashboardCountItem[]
  }
  meta: {
    activeRule: string
    sourceTable: string
  }
}
