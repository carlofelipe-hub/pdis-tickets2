import DashboardLayout from "../dashboard/layout"

export default function PMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
