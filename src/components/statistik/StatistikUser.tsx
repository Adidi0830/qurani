"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { fetchAllStatistikData } from "@/utils/api/statistik/fetch";
import { UserX, Users, Calendar, User } from "lucide-react"
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from "recharts"
import { useI18n } from "@/components/providers/i18n-provider"
import { useStatistikData } from "@/hooks/use-statistik-data";


interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {payload.map((entry, index: number) => (
          <p
          key={index}
          className="text-sm dark:text-white"
          style={{ color: entry.color }}
        >
          {`${entry.name}: ${entry.value}`}
        </p>
        ))}
      </div>
    );
  }
  return null;
};



const KPICardSkeleton = () => (
  <Card className="bg-white dark:bg-gray-800 shadow-lg animate-pulse">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </CardContent>
  </Card>
)

const ChartSkeleton = () => (
  <Card className="bg-white dark:bg-gray-800 shadow-lg animate-pulse">
    <CardHeader>
      <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </CardHeader>
    <CardContent>
      <div className="h-64 flex items-center justify-center">
        <div className="space-y-4 w-full">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
        </div>
      </div>
    </CardContent>
  </Card>
)


export default function StatistikUser() {
  const { t, locale } = useI18n()
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current-month")
  const [totalBlockedUsers, setTotalBlockedUsers] = useState<{
    totalBlockedUsersBulanIni: number;
    totalBlockedUsersBulanLalu: number;
    persentase: number;
  }>({
    totalBlockedUsersBulanIni: 0,
    totalBlockedUsersBulanLalu: 0,
    persentase: 0,
  });
  const [totalPengguna, setTotalPengguna] = useState<{
    totalPenggunaBulanIni: number;
    totalPenggunaBulanLalu: number;
    persentase: number;
  }>({
    totalPenggunaBulanIni: 0,
    totalPenggunaBulanLalu: 0,
    persentase: 0,
  });
  const [totalGroups, setTotalGroups] = useState<{
    totalGroupsBulanIni: number;
    totalGroupsBulanLalu: number;
    persentase: number;
  }>({
    totalGroupsBulanIni: 0,
    totalGroupsBulanLalu: 0,
    persentase: 0,
  });
  const [groupSetoranTerbanyak, setGroupSetoranTerbanyak] = useState<{
    group_name: string;
    total: number;
  }[]>([]);
  const [depositTypeData, setDepositTypeData] = useState<{
    month: string;
    Surat: number;
    Juz: number;
    Halaman: number;
  }[]>([]);

  const formattedData = groupSetoranTerbanyak.map(item => ({
    name: item.group_name, // ini yang akan tampil di tooltip
    value: item.total,
    color: "#8884d8"
  }));

  // Generate month options for the last 12 months
  const generateMonthOptions = () => {
    const months = []
    const currentDate = new Date()
    
    // Month names mapping
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ]
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthIndex = date.getMonth()
      const monthKey = monthNames[monthIndex]
      const monthName = t(`statistik.months.${monthKey}`)
      const year = date.getFullYear()
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      months.push({ value, label: `${monthName} ${year}` })
    }
    
    return months
  }

  const monthOptions = generateMonthOptions()

  // Compute start/end date based on selected period
  const { startDate, endDate } = (() => {
    if (selectedPeriod === "all") {
      return { startDate: "1970-01-01", endDate: "9999-12-31" }
    }
    else if (selectedPeriod === "current-year") {
      const currentDate = new Date()
      const year = currentDate.getFullYear()
      const s = `${year}-01-01`
      const e = `${year}-12-31`

      return { startDate: s, endDate: e }
    }
    else if (selectedPeriod === "current-month") {
      const currentDate = new Date()
      const s = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`
      const e = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}`
      return { startDate: s, endDate: e }
    } else {
      const [year, month] = selectedPeriod.split('-')
      const s = `${year}-${month}-01`
      const e = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`
      return { startDate: s, endDate: e }
    }
  })()

  const { data, isLoading } = useStatistikData({
    startDate,
    endDate,
  })

  // Update local states when hook data changes (preserve existing rendering logic)
  useEffect(() => {
    if (!data?.success || !data?.data) return
    const d = data.data
    // For blocked users, we'll use a static count for now since we don't have real blocked users data
    setTotalBlockedUsers({
      totalBlockedUsersBulanIni: 0, // You can replace this with real blocked users count
      totalBlockedUsersBulanLalu: 0,
      persentase: 0
    })
    setTotalPengguna(d.totalPengguna)
    setTotalGroups(d.totalGroups)
    setGroupSetoranTerbanyak(d.groupSetoranTerbanyak || [])
    setDepositTypeData(d.depositTypeData || [])
  }, [data])

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  function getBlockedUsersLabel(selectedPeriod: string, t: (key: string, fallback?: string, params?: Record<string, string | number>) => string, locale: string) {
    if (selectedPeriod === "all") {
      return t("statistik.blocked_users_all")
    }
  
    if (selectedPeriod === "current-year") {
      return t("statistik.blocked_users_this_year")
    }
  
    if (selectedPeriod === "current-month") {
      return t("statistik.blocked_users_this_month")
    }
  
    // Format custom: YYYY-MM
    const [year, month] = selectedPeriod.split("-")
    const namaBulan = new Date(parseInt(year), parseInt(month) - 1)
      .toLocaleString(locale === "id" ? "id-ID" : "en-US", { month: "long" })
  
    return t("statistik.blocked_users_month", undefined, { month: namaBulan, year })
  }

  function getGroupsLabel(selectedPeriod: string, t: (key: string, fallback?: string, params?: Record<string, string | number>) => string, locale: string) {
    if (selectedPeriod === "all") {
      return t("statistik.groups_all")
    }
  
    if (selectedPeriod === "current-year") {
      return t("statistik.groups_this_year")
    }
  
    if (selectedPeriod === "current-month") {
      return t("statistik.groups_this_month")
    }
  
    // Format custom: YYYY-MM
    const [year, month] = selectedPeriod.split("-")
    const namaBulan = new Date(parseInt(year), parseInt(month) - 1)
      .toLocaleString(locale === "id" ? "id-ID" : "en-US", { month: "long" })
  
    return t("statistik.groups_month", undefined, { month: namaBulan, year })
  }

  function getUsersLabel(selectedPeriod: string, t: (key: string, fallback?: string, params?: Record<string, string | number>) => string, locale: string) {
    if (selectedPeriod === "all") {
      return t("statistik.users_all")
    }
  
    if (selectedPeriod === "current-year") {
      return t("statistik.users_this_year")
    }
  
    if (selectedPeriod === "current-month") {
      return t("statistik.users_this_month")
    }
  
    // Format custom: YYYY-MM
    const [year, month] = selectedPeriod.split("-")
    const namaBulan = new Date(parseInt(year), parseInt(month) - 1)
      .toLocaleString(locale === "id" ? "id-ID" : "en-US", { month: "long" })
  
    return t("statistik.users_month", undefined, { month: namaBulan, year })
  }

  return (
    <div className="min-h-screen p-4 md:pt-8">
      <div className="max-w-7xl mx-auto space-y-3 md:space-y-4">
        {/* Header */}
        <div className="mb-2 md:mb-4 flex flex-col gap-3 md:gap-5 sm:flex-row sm:gap-0 justify-between">
          {isLoading ? (
            <Skeleton className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("statistik.users_dashboard")}</h1>
          )}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            {isLoading ? (
              <div className="flex gap-3 items-center w-full">
                <Skeleton className="h-10 flex-1 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ) : (
              <>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("statistik.period")}:</span>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder={t("statistik.period")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("statistik.all")}</SelectItem>
                      <SelectItem value="current-year">{t("statistik.this_year")}</SelectItem>
                      <SelectItem value="current-month">{t("statistik.this_month")}</SelectItem>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {isLoading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : (
            <>
              {/* Blocked Users */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {isLoading ? (
                        <Skeleton className="h-4 w-32 mb-2" />
                      ) : (
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{getBlockedUsersLabel(selectedPeriod, t, locale)}</p>
                      )}
                      {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalBlockedUsers.totalBlockedUsersBulanIni}</p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                      <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pengguna */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {isLoading ? (
                        <Skeleton className="h-4 w-32 mb-2" />
                      ) : (
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{getUsersLabel(selectedPeriod, t, locale)}</p>
                      )}
                      {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {totalPengguna.totalPenggunaBulanIni}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Groups */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {isLoading ? (
                        <Skeleton className="h-4 w-32 mb-2" />
                      ) : (
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{getGroupsLabel(selectedPeriod, t, locale)}</p>
                      )}
                      {isLoading ? (
                        <Skeleton className="h-8 w-20" />
                      ) : (
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalGroups.totalGroupsBulanIni}</p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/20 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {isLoading ? (
            <>
              <ChartSkeleton />
              <ChartSkeleton />
            </>
          ) : (
            <>
              {/* Group Setoran Terbanyak - Pie Chart */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isLoading ? (
                      <Skeleton className="h-6 w-48" />
                    ) : (
                      t("statistik.top_recitation_group")
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!isLoading && groupSetoranTerbanyak && formattedData && groupSetoranTerbanyak.length > 0 ? (
                    <>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                data={formattedData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name} : ${entry.value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                              {groupSetoranTerbanyak.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#8884d8' : index === 1 ? '#14b8a6' : index === 2 ? '#f59e0b' : '#f97316'} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {groupSetoranTerbanyak.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: `${index === 0 ? '#8884d8' : index === 1 ? '#14b8a6' : index === 2 ? '#f59e0b' : '#f97316'}`}}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{item.group_name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : !isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">{t("statistik.no_data.deposit_group")}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">{t("statistik.no_data.selected_period")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="space-y-4 w-full">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-32 w-full rounded-lg" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tipe Setoran Terbanyak - Bar Chart */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isLoading ? (
                      <Skeleton className="h-6 w-48" />
                    ) : (
                      t("statistik.top_recitation_type")
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!isLoading && depositTypeData && depositTypeData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={depositTypeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="Surat"  name={t("statistik.surah")} fill="#3b82f6" />
                          <Bar dataKey="Juz" name={t("statistik.juz")} fill="#14b8a6" />
                          <Bar dataKey="Halaman" name={t("statistik.page")} fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : !isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400">{t("statistik.no_data.deposit_type")}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">{t("statistik.no_data.selected_period")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center">
                      <div className="space-y-4 w-full">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-32 w-full rounded-lg" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
