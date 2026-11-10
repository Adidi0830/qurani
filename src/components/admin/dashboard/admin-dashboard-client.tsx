"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, Shield, UserX, Users } from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { AdminDashboardSummary, DashboardCountItem } from "@/types/admin-dashboard"
import Link from "next/link"
import { useI18n } from "@/components/providers/i18n-provider"
import { formatNumber } from "@/utils/i18n-helpers"

const genderFill = (name: string) => `var(--color-${name})`

const isEmptyData = (summary: AdminDashboardSummary) => {
  const { cards, charts } = summary
  return (
    cards.totalUsers === 0 &&
    charts.genderCounts.length === 0 &&
    charts.topCountries.length === 0 &&
    charts.topStates.length === 0 &&
    charts.topCities.length === 0
  )
}

const BarChartCard = ({
  title,
  description,
  data,
  emptyLabel,
  config,
}: {
  title: string
  description: string
  data: DashboardCountItem[]
  emptyLabel: string
  config: ChartConfig
}) => {
  const chartHeight = React.useMemo(() => Math.max(240, data.length * 26), [data.length])

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-slate-500">
            {emptyLabel}
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto pr-2">
            <ChartContainer
              config={config}
              className="aspect-auto w-full"
              style={{ height: chartHeight }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={140}
                    tickFormatter={(value: string) =>
                      value.length > 18 ? `${value.slice(0, 18)}...` : value
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminDashboardClient({ summary }: { summary: AdminDashboardSummary }) {
  const { t, locale } = useI18n()

  const barConfig = React.useMemo(
    () =>
      ({
        value: {
          label: t("labels.users", "Users"),
          color: "hsl(142 72% 35%)",
        },
      }) satisfies ChartConfig,
    [t]
  )

  const genderConfig = React.useMemo(
    () =>
      ({
        Male: {
          label: t("legend.male", "Male"),
          color: "hsl(142 72% 35%)",
        },
        Female: {
          label: t("legend.female", "Female"),
          color: "hsl(160 62% 40%)",
        },
        Unknown: {
          label: t("legend.unknown", "Unknown"),
          color: "hsl(215 16% 60%)",
        },
      }) satisfies ChartConfig,
    [t]
  )

  if (isEmptyData(summary)) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        {t("empty", "No data available")}
      </div>
    )
  }

  const activeRuleLower = summary.meta.activeRule.toLowerCase()
  const showActiveNote =
    activeRuleLower.includes("not available") || activeRuleLower.includes("not configured")

  const cards = [
    {
      title: t("cards.total_users", "Total Users"),
      value: summary.cards.totalUsers,
      icon: Users,
      href: "/users/manage",
    },
    {
      title: t("cards.total_admins", "Total Admins"),
      value: summary.cards.totalAdmins,
      icon: Shield,
      href: "/users/manage?role=admin",
    },
    {
      title: t("cards.active_users", "Active Users"),
      value: summary.cards.activeUsers,
      icon: Activity,
      note: showActiveNote ? summary.meta.activeRule : undefined,
      href: "/users/manage?status=active",
    },
    {
      title: t("cards.blocked_users", "Blocked Users"),
      value: summary.cards.blockedUsers,
      icon: UserX,
      href: "/users/manage?status=blocked",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              aria-label={t("aria.view", "View {{title}}", { title: card.title })}
            >
              <Card className="bg-white border-slate-200 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardDescription>{card.title}</CardDescription>
                  <CardTitle className="text-3xl text-emerald-700">
                    {formatNumber(card.value, locale)}
                  </CardTitle>
                  <CardAction>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </div>
                  </CardAction>
                </CardHeader>
                {card.note ? (
                  <CardContent className="pt-0 text-xs text-slate-500">
                    {card.note}
                  </CardContent>
                ) : null}
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-900">
              {t("charts.gender", "Gender")}
            </CardTitle>
            <CardDescription>
              {t("charts.user_distribution", "User distribution")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.charts.genderCounts.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center text-sm text-slate-500">
                {t("empty", "No data available")}
              </div>
            ) : (
              <ChartContainer config={genderConfig} className="aspect-auto h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <Pie
                      data={summary.charts.genderCounts}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      strokeWidth={2}
                    >
                      {summary.charts.genderCounts.map((entry) => (
                        <Cell key={entry.name} fill={genderFill(entry.name)} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <BarChartCard
          title={t("charts.top_countries", "Top Countries")}
          description={t("charts.top_locations", "Top locations by users")}
          data={summary.charts.topCountries}
          emptyLabel={t("empty", "No data available")}
          config={barConfig}
        />
        <BarChartCard
          title={t("charts.top_states", "Top States")}
          description={t("charts.top_locations", "Top locations by users")}
          data={summary.charts.topStates}
          emptyLabel={t("empty", "No data available")}
          config={barConfig}
        />
        <BarChartCard
          title={t("charts.top_cities", "Top Cities")}
          description={t("charts.top_locations", "Top locations by users")}
          data={summary.charts.topCities}
          emptyLabel={t("empty", "No data available")}
          config={barConfig}
        />
      </div>
    </div>
  )
}
