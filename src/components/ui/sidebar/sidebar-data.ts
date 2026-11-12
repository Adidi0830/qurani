import * as React from "react"
import {
  LayoutDashboard,
  Settings,
  CreditCard,
  Shield,
  Database,
  Users,
  UserCog,
  FileText,
  BookOpen,
  UserCheck,
  Bell,
  LucideIcon,
  Languages,
  GraduationCap,
  Package,
  Banknote,
  Tag,
  Receipt,
  Wallet,
  Globe,
  CalendarDays,
  Star,
  KeyRound,
  RotateCcw,
  ArrowDownToLine,
  Award,
} from "lucide-react"
import { RxDashboard } from "react-icons/rx"
import { MdAnnouncement } from "react-icons/md"

export type NavItem = {
  title: string
  url: string
  icon?: LucideIcon | React.ComponentType<React.SVGProps<SVGSVGElement>>
  items?: NavItem[]
  isDownloadApp?: boolean
}

export const getSidebarData = (
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string
): { navMain: NavItem[] } => {
  const baseNavItems: NavItem[] = [
    {
      title: t("navigation.dashboard", "Dashboard"),
      url: "/dashboard",
      icon: LayoutDashboard,
      items: [],
    },
    {
      title: t("navigation.support", "Support"),
      url: "/support",
      icon: MdAnnouncement,
      items: [
        {
          title: t("navigation.dashboard", "Dashboard"),
          url: "/support/dashboard",
          icon: RxDashboard,
        },
        {
          title: t("navigation.support_tickets", "Support Tickets"),
          url: "/support/tickets",
          icon: FileText,
        },
        {
          title: t("navigation.manage_groups", "Groups"),
          url: "/groups",
          icon: Users,
        },
        {
          title: t("navigation.recitation", "Recitation"),
          url: "/support/recitation",
          icon: BookOpen,
        },
        {
          title: t("navigation.kyc_member", "KYC Member"),
          url: "/support/kyc-member",
          icon: UserCheck,
        },
        {
          title: t("navigation.kyc_organization", "KYC Organisasi"),
          url: "/support/kyc-organisasi",
          icon: GraduationCap,
        },
      ],
    },
    {
      title: t("navigation.billing", "Billing"),
      url: "/billing",
      icon: CreditCard,
      items: [
        {
          title: t("navigation.dashboard", "Dashboard"),
          url: "/billing/dashboard",
          icon: RxDashboard,
        },
        {
          title: t("navigation.orders", "Orders"),
          url: "/billing/orders",
          icon: Receipt,
        },
        {
          title: t("navigation.promo_coupons", "Promo & Coupons"),
          url: "/billing/discountcodes",
          icon: Tag,
        },
        {
          title: t("navigation.wallet", "Wallet"),
          url: "/billing/wallet",
          icon: Wallet,
        },
        {
          title: t("navigation.topup", "TopUp"),
          url: "/billing/topup",
          icon: ArrowDownToLine,
        },
        {
          title: t("billing.payments.title", "Payment"),
          url: "/billing/payments",
          icon: Banknote,
        },
        {
          title: t("navigation.trainer_payout", "Payout"),
          url: "/billing/payout",
          icon: Banknote,
        },
        {
          title: t("navigation.refund", "Refund"),
          url: "/billing/refund",
          icon: RotateCcw,
        },
        {
          title: t("navigation.withdraw", "Withdraw"),
          url: "/billing/withdraw",
          icon: ArrowDownToLine,
        },
      ],
    },
    {
      title: t("navigation.administrator", "Administrator"),
      url: "/admin",
      icon: Shield,
      items: [
        {
          title: t("navigation.dashboard", "Dashboard"),
          url: "/admin/dashboard",
          icon: RxDashboard,
        },
        {
          title: t("navigation.manage_users", "Users"),
          url: "/users/manage",
          icon: UserCog,
        },
        {
          title: t("navigation.roles", "Roles"),
          url: "/admin/roles",
          icon: Shield,
        },
        {
          title: t("navigation.permissions", "Permissions"),
          url: "/admin/permissions",
          icon: KeyRound,
        },
      ],
    },
    {
      title: t("navigation.master_data", "Master Data"),
      url: "/master",
      icon: Database,
      items: [
        {
          title: t("navigation.dashboard", "Dashboard"),
          url: "/master/dashboard",
          icon: RxDashboard,
        },
        {
          title: t("navigation.countries", "Countries"),
          url: "/master/countries",
          icon: Database,
        },
        {
          title: t("navigation.states", "States"),
          url: "/master/states",
          icon: Database,
        },
        {
          title: t("navigation.cities", "Cities"),
          url: "/master/cities",
          icon: Database,
        },
        {
          title: t("navigation.currencies", "Currencies"),
          url: "/master/currencies",
          icon: Database,
        },
        {
          title: t("navigation.languages", "Languages"),
          url: "/master/languages",
          icon: Languages,
        },
        {
          title: t("navigation.locales", "Locales"),
          url: "/master/locales",
          icon: Languages,
        },
        {
          title: t("navigation.timezones", "Timezones"),
          url: "/master/timezones",
          icon: Globe,
        },
        {
          title: t("navigation.categories", "Categories"),
          url: "/master/categories",
          icon: Tag,
        },
        {
          title: t("navigation.tax_rates", "Tax Rates"),
          url: "/billing/taxrates",
          icon: Receipt,
        },
        {
          title: t("navigation.member_subscription", "Member Subscription"),
          url: "/billing/member-subscription",
          icon: UserCheck,
        },
      ],
    },
    {
      title: t("navigation.trainers_management", "Trainer Management"),
      url: "/teachers",
      icon: GraduationCap,
      items: [
        {
          title: t("navigation.trainers", "Active Trainers"),
          url: "/teachers",
          icon: GraduationCap,
        },
        {
          title: t("navigation.trainer_applications", "Trainer Applications"),
          url: "/teachers/applications",
          icon: UserCheck,
        },
        {
          title: t("navigation.trainer_calendar", "Trainer Calendar"),
          url: "/teachers/calendar",
          icon: CalendarDays,
        },
        {
          title: t("navigation.trainer_performance", "Trainer Performance"),
          url: "/teachers/performance",
          icon: Star,
        },
        {
          title: t("navigation.packages", "Courses"),
          url: "/teachers/courses",
          icon: Package,
        },
        {
          title: t("navigation.trainer_certificates", "Certificates"),
          url: "/teachers/certificates",
          icon: Award,
        },
      ],
    },
    {
      title: t("navigation.notifications", "Notifications"),
      url: "/notification",
      icon: Bell,
      items: [],
    },
    {
      title: t("navigation.settings", "Settings"),
      url: "/settings",
      icon: Settings,
      items: [],
    },
  ]

  return { navMain: baseNavItems }
}

