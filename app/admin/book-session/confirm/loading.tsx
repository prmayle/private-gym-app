export default function ConfirmBookingLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse mr-2" />
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="space-y-4">
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-16 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  )
}
