import DashboardLayout from "../dashboard/layout"

export default function ApprovalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}

