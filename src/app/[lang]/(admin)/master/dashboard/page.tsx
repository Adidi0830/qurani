import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Database,
    Globe,
    MapPin,
    DollarSign,
    Languages,
    Clock,
    Map as MapIcon,
    TrendingUp,
    Server
} from "lucide-react"

function MasterDataDashboardContent() {
    // Dummy data
    const systemStats = {
        database: { value: 2, label: "Smooth operation", details: "0.19 / 0.16 / 0.10" },
        api: { value: 1.3, label: "4 Core(s)", details: "API Usage" },
        memory: { value: 59.9, label: "2453 / 4096(MB)", details: "RAM usage" }
    }

    const diskUsage = {
        used: 18,
        total: "6.66/38.08 GB"
    }

    const overviewCards = [
        {
            title: "Countries",
            icon: Globe,
            running: 250,
            stopped: 0,
            total: 250,
            color: "emerald"
        },
        {
            title: "States",
            icon: MapIcon,
            running: 4963,
            stopped: 0,
            total: 4963,
            color: "blue"
        },
        {
            title: "Cities",
            icon: MapPin,
            running: 148562,
            stopped: 0,
            total: 148562,
            color: "purple"
        },
        {
            title: "Currencies",
            icon: DollarSign,
            running: 164,
            stopped: 0,
            total: 164,
            color: "amber"
        }
    ]

    const statisticsCards = [
        {
            title: "Languages",
            icon: Languages,
            version: "v2.1",
            status: "Active",
            count: 184,
            color: "green"
        },
        {
            title: "Timezones",
            icon: Clock,
            version: "v1.0",
            status: "Active",
            count: 425,
            color: "blue"
        },
        {
            title: "Locales",
            icon: Globe,
            version: "v1.0",
            status: "Active",
            count: 256,
            color: "purple"
        },
        {
            title: "API Status",
            icon: Server,
            version: "v3.0",
            status: "Running",
            count: 100,
            color: "emerald"
        }
    ]

    const trafficData = {
        upstream: "14.40 KB",
        downstream: "10.24 KB",
        totalSent: "887.96 MB",
        totalReceived: "350.27 MB"
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
            <div className="max-w-[1600px] mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Data Dashboard</h1>
                    </div>
                </div>

                {/* Top Row: System Status + Disk */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* System Status */}
                    <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                        <CardHeader className="pb-0">
                            <CardTitle className="text-gray-900 dark:text-white text-base">System Status</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-3 gap-4">
                                {/* Database Load */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-24 h-24">
                                        <svg className="w-24 h-24 transform -rotate-90">
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="42"
                                                stroke="currentColor"
                                                strokeWidth="6"
                                                fill="none"
                                                className="text-gray-200 dark:text-gray-700"
                                            />
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="42"
                                                stroke="currentColor"
                                                strokeWidth="6"
                                                fill="none"
                                                strokeDasharray={`${2 * Math.PI * 42}`}
                                                strokeDashoffset={`${2 * Math.PI * 42 * (1 - systemStats.database.value / 100)}`}
                                                className="text-emerald-500 transition-all duration-500"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">{systemStats.database.value}%</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{systemStats.database.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{systemStats.database.details}</p>
                                    </div>
                                </div>

                                {/* API Usage */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-24 h-24">
                                        <svg className="w-24 h-24 transform -rotate-90">
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="42"
                                                stroke="currentColor"

                                                fill="none"
                                                className="text-gray-200 dark:text-gray-700"
                                            />
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="42"
                                                stroke="currentColor"
                                                strokeWidth="6"
                                                fill="none"
                                                strokeDasharray={`${2 * Math.PI * 42}`}
                                                strokeDashoffset={`${2 * Math.PI * 42 * (1 - systemStats.api.value / 100)}`}
                                                className="text-blue-500 transition-all duration-500"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">{systemStats.api.value}%</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{systemStats.api.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{systemStats.api.details}</p>
                                    </div>
                                </div>

                                {/* Memory Usage */}
                                <div className="flex flex-col items-center">
                                    <div className="relative w-24 h-24">
                                        <svg className="w-24 h-24 transform -rotate-90">
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="42"
                                                stroke="currentColor"
                                                strokeWidth="6"
                                                fill="none"
                                                className="text-gray-200 dark:text-gray-700"
                                            />
                                            <circle
                                                cx="48"
                                                cy="48"
                                                r="42"
                                                stroke="currentColor"
                                                strokeWidth="6"
                                                fill="none"
                                                strokeDasharray={`${2 * Math.PI * 42}`}
                                                strokeDashoffset={`${2 * Math.PI * 42 * (1 - systemStats.memory.value / 100)}`}
                                                className="text-emerald-500 transition-all duration-500"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">{systemStats.memory.value}%</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{systemStats.memory.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{systemStats.memory.details}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Disk Usage */}
                    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                        <CardHeader className="pb-0">
                            <CardTitle className="text-gray-900 dark:text-white text-base">Disk</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between px-6 py-4">
                            <div className="flex flex-col">
                                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{diskUsage.used}%</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">{diskUsage.total}</span>
                            </div>
                            <div className="relative w-32 h-32">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    {/* Background circles */}
                                    {[0, 1, 2, 3].map((i) => (
                                        <circle
                                            key={i}
                                            cx="64"
                                            cy="64"
                                            r={56 - i * 10}
                                            stroke="currentColor"
                                            strokeWidth="6"
                                            fill="none"
                                            className="text-gray-200 dark:text-gray-700"
                                        />
                                    ))}
                                    {/* Active circle */}
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="currentColor"
                                        strokeWidth="6"
                                        fill="none"
                                        strokeDasharray={`${2 * Math.PI * 56}`}
                                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - diskUsage.used / 100)}`}
                                        className="text-emerald-500 transition-all duration-500"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Overview Section */}
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-gray-900 dark:text-white text-base font-semibold">Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {overviewCards.map((card, index) => {
                                const Icon = card.icon
                                return (
                                    <Card key={index} className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg bg-${card.color}-100 dark:bg-${card.color}-900/20 flex items-center justify-center`}>
                                                        <Icon className={`w-5 h-5 text-${card.color}-600 dark:text-${card.color}-400`} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 dark:text-white">{card.title}</h3>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-emerald-600 dark:text-emerald-400">Active: {card.running}</span>
                                                        <span className="text-gray-500 dark:text-gray-400">Inactive: {card.stopped}</span>
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        Total: <span className="font-semibold text-gray-900 dark:text-white">{card.total}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Bottom Row: Statistics + Traffic */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Statistics */}
                    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                        <CardHeader className="pb-0">
                            <CardTitle className="text-gray-900 dark:text-white text-base">Statistics</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-2 gap-4">
                                {statisticsCards.map((stat, index) => {
                                    const Icon = stat.icon
                                    return (
                                        <div key={index} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`w-12 h-12 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20 flex items-center justify-center`}>
                                                    <Icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">{stat.title}</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.version}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                                    {stat.status}
                                                </span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">{stat.count}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Traffic */}
                    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 gap-1 py-4">
                        <CardHeader className="pb-0">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-gray-900 dark:text-white text-base">Traffic</CardTitle>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Data I/O</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4 text-center">
                                    <div>
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Upstream</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{trafficData.upstream}</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Downstream</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{trafficData.downstream}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total sent</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{trafficData.totalSent}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total received</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{trafficData.totalReceived}</p>
                                    </div>
                                </div>

                                {/* Chart Area */}
                                <div className="h-48 relative">
                                    <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                                        {/* Grid lines */}
                                        {[0, 1, 2, 3, 4, 5].map((i) => (
                                            <line
                                                key={i}
                                                x1="0"
                                                y1={i * 30}
                                                x2="400"
                                                y2={i * 30}
                                                stroke="currentColor"
                                                strokeWidth="0.5"
                                                className="text-gray-200 dark:text-gray-700"
                                            />
                                        ))}

                                        {/* Downstream area (green) */}
                                        <path
                                            d="M0,120 Q50,110 100,115 T200,105 T300,100 T400,95 L400,150 L0,150 Z"
                                            fill="currentColor"
                                            className="text-emerald-500 opacity-60"
                                        />

                                        {/* Upstream area (blue) */}
                                        <path
                                            d="M0,90 Q50,85 100,88 T200,82 T300,78 T400,75 L400,150 L0,150 Z"
                                            fill="currentColor"
                                            className="text-blue-500 opacity-40"
                                        />

                                        {/* Downstream line */}
                                        <path
                                            d="M0,120 Q50,110 100,115 T200,105 T300,100 T400,95"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="text-emerald-500"
                                        />

                                        {/* Upstream line */}
                                        <path
                                            d="M0,90 Q50,85 100,88 T200,82 T300,78 T400,75"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            className="text-blue-500"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default function MasterDataDashboard() {
    return <MasterDataDashboardContent />
}
