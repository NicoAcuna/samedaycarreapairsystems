import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-neutral-100">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-24 md:pb-0">
        {children}
      </main>
    </div>
  )
}