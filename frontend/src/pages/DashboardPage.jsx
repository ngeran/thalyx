
import { Package } from "lucide-react"

const DashboardPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your Thalyx system</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Devices</p>
              <p className="text-2xl font-bold">1,234</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        {/* Other cards… */}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
        </div>
        <div className="p-6">
          {/* Activity items */}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
