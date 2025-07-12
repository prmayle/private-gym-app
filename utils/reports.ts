import * as XLSX from "xlsx"
import { normalizeStatus } from "@/types/status"

export interface ReportFilters {
  reportType: string
  startDate: string
  endDate: string
  packageFilter: string
  memberFilter: string
  sessionStatus: string
  emailAddress: string
  notes: string
}

export interface ReportData {
  title: string
  summary: any
  data: any[]
  charts?: any[]
}

// Generate report based on filters
export const generateReport = async (filters: ReportFilters): Promise<ReportData> => {
  const { reportType, startDate, endDate, packageFilter, memberFilter, sessionStatus } = filters

  // Load data from localStorage
  const members = JSON.parse(localStorage.getItem("gym-members") || "[]")
  const packageRecords = JSON.parse(localStorage.getItem("member-packages-records") || "[]")
  const sessions = JSON.parse(localStorage.getItem("gym-calendar-slots") || "[]")
  const defaultMembers = [
    { id: "1", name: "John Doe", email: "john@example.com", joinDate: "2023-01-15" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", joinDate: "2023-02-20" },
    { id: "3", name: "Michael Johnson", email: "michael@example.com", joinDate: "2023-03-10" },
    { id: "4", name: "Emily Williams", email: "emily@example.com", joinDate: "2023-04-05" },
    { id: "5", name: "Robert Brown", email: "robert@example.com", joinDate: "2023-05-12" },
  ]
  const allMembers = members.length > 0 ? [...members, ...defaultMembers] : defaultMembers

  // Mock sessions data if empty
  const mockSessions = [
    {
      id: "1",
      date: "2024-12-15",
      status: "Active",
      memberName: "John Doe",
      trainer: "Mike Johnson",
      type: "Personal Training",
      time: "10:00 AM",
      capacity: 1,
      booked: 1,
    },
    {
      id: "2",
      date: "2024-12-16",
      status: "Active",
      memberName: "Jane Smith",
      trainer: "Sarah Williams",
      type: "Group Class",
      time: "2:00 PM",
      capacity: 10,
      booked: 8,
    },
    {
      id: "3",
      date: "2024-12-17",
      status: "Completed",
      memberName: "Michael Brown",
      trainer: "David Lee",
      type: "Consultation",
      time: "4:00 PM",
      capacity: 1,
      booked: 1,
    },
  ]
  const allSessions = sessions.length > 0 ? sessions : mockSessions

  // Mock package records if empty
  const mockPackageRecords = [
    {
      id: "pkg-1",
      memberId: "1",
      memberName: "John Doe",
      packageName: "Personal Training",
      price: 500,
      sessionsTotal: 10,
      sessionsUsed: 3,
      purchaseDate: "2024-11-15",
      paymentStatus: "paid",
    },
    {
      id: "pkg-2",
      memberId: "2",
      memberName: "Jane Smith",
      packageName: "Group Class",
      price: 240,
      sessionsTotal: 12,
      sessionsUsed: 5,
      purchaseDate: "2024-12-01",
      paymentStatus: "paid",
    },
    {
      id: "pkg-3",
      memberId: "3",
      memberName: "Michael Johnson",
      packageName: "Nutrition Consultation",
      price: 300,
      sessionsTotal: 6,
      sessionsUsed: 2,
      purchaseDate: "2024-11-20",
      paymentStatus: "pending",
    },
  ]
  const allPackageRecords = packageRecords.length > 0 ? packageRecords : mockPackageRecords

  // Filter data by date range
  const filterByDateRange = (items: any[], dateField: string) => {
    return items.filter((item) => {
      const itemDate = new Date(item[dateField])
      const start = new Date(startDate)
      const end = new Date(endDate)
      return itemDate >= start && itemDate <= end
    })
  }

  // Apply filters
  let filteredPackageRecords = filterByDateRange(allPackageRecords, "purchaseDate")
  let filteredSessions = filterByDateRange(allSessions, "date")

  if (packageFilter !== "all") {
    filteredPackageRecords = filteredPackageRecords.filter((pkg) =>
      pkg.packageName.toLowerCase().includes(packageFilter.replace("-", " ")),
    )
  }

  if (memberFilter !== "all") {
    filteredPackageRecords = filteredPackageRecords.filter((pkg) => pkg.memberId === memberFilter)
    filteredSessions = filteredSessions.filter((session) => {
      const member = allMembers.find((m) => m.id === memberFilter)
      return member && session.memberName === member.name
    })
  }

  if (sessionStatus !== "all") {
    filteredSessions = filteredSessions.filter(
      (session) => normalizeStatus(session.status) === normalizeStatus(sessionStatus),
    )
  }

  // Generate report based on type
  switch (reportType) {
    case "revenue-per-package":
      return generateRevenuePerPackageReport(filteredPackageRecords)

    case "sessions-by-status":
      return generateSessionsByStatusReport(filteredSessions)

    case "income-per-date":
      return generateIncomePerDateReport(filteredPackageRecords)

    case "income-per-member":
      return generateIncomePerMemberReport(filteredPackageRecords, allMembers)

    case "attendance-per-session":
      return generateAttendancePerSessionReport(filteredSessions)

    default:
      throw new Error("Invalid report type")
  }
}

const generateRevenuePerPackageReport = (packageRecords: any[]): ReportData => {
  const packageRevenue = packageRecords
    .filter((pkg) => pkg.paymentStatus === "paid")
    .reduce((acc, pkg) => {
      acc[pkg.packageName] = (acc[pkg.packageName] || 0) + pkg.price
      return acc
    }, {})

  const data = Object.entries(packageRevenue).map(([packageName, revenue]) => ({
    "Package Name": packageName,
    "Total Revenue": revenue,
    "Number of Sales": packageRecords.filter((pkg) => pkg.packageName === packageName && pkg.paymentStatus === "paid")
      .length,
    "Average Price": Math.round(
      (revenue as number) /
        packageRecords.filter((pkg) => pkg.packageName === packageName && pkg.paymentStatus === "paid").length,
    ),
  }))

  const totalRevenue = Object.values(packageRevenue).reduce((sum: number, revenue) => sum + (revenue as number), 0)

  return {
    title: "Revenue per Package Report",
    summary: {
      totalRevenue,
      totalPackagesSold: packageRecords.filter((pkg) => pkg.paymentStatus === "paid").length,
      averageRevenuePerPackage: Math.round(totalRevenue / data.length),
    },
    data,
  }
}

const generateSessionsByStatusReport = (sessions: any[]): ReportData => {
  const statusCounts = sessions.reduce((acc, session) => {
    const status = normalizeStatus(session.status)
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    Status: status,
    "Number of Sessions": count,
    Percentage: Math.round(((count as number) / sessions.length) * 100),
  }))

  return {
    title: "Sessions by Status Report",
    summary: {
      totalSessions: sessions.length,
      mostCommonStatus: Object.entries(statusCounts).reduce((a, b) =>
        statusCounts[a[0]] > statusCounts[b[0]] ? a : b,
      )[0],
    },
    data,
  }
}

const generateIncomePerDateReport = (packageRecords: any[]): ReportData => {
  const dailyIncome = packageRecords
    .filter((pkg) => pkg.paymentStatus === "paid")
    .reduce((acc, pkg) => {
      const date = new Date(pkg.purchaseDate).toISOString().split("T")[0]
      acc[date] = (acc[date] || 0) + pkg.price
      return acc
    }, {})

  const data = Object.entries(dailyIncome)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, income]) => ({
      Date: new Date(date).toLocaleDateString(),
      Income: income,
      "Number of Purchases": packageRecords.filter(
        (pkg) => pkg.purchaseDate.startsWith(date) && pkg.paymentStatus === "paid",
      ).length,
    }))

  const totalIncome = Object.values(dailyIncome).reduce((sum: number, income) => sum + (income as number), 0)

  return {
    title: "Income per Date Report",
    summary: {
      totalIncome,
      averageDailyIncome: Math.round(totalIncome / data.length),
      highestIncomeDay: data.reduce((max, day) => (day.Income > max.Income ? day : max), data[0]),
    },
    data,
  }
}

const generateIncomePerMemberReport = (packageRecords: any[], members: any[]): ReportData => {
  const memberIncome = packageRecords
    .filter((pkg) => pkg.paymentStatus === "paid")
    .reduce((acc, pkg) => {
      acc[pkg.memberName] = (acc[pkg.memberName] || 0) + pkg.price
      return acc
    }, {})

  const data = Object.entries(memberIncome).map(([memberName, income]) => ({
    "Member Name": memberName,
    "Total Spent": income,
    "Number of Packages": packageRecords.filter((pkg) => pkg.memberName === memberName && pkg.paymentStatus === "paid")
      .length,
    "Average Package Price": Math.round(
      (income as number) /
        packageRecords.filter((pkg) => pkg.memberName === memberName && pkg.paymentStatus === "paid").length,
    ),
  }))

  const totalIncome = Object.values(memberIncome).reduce((sum: number, income) => sum + (income as number), 0)

  return {
    title: "Income per Member Report",
    summary: {
      totalIncome,
      averageIncomePerMember: Math.round(totalIncome / data.length),
      topSpendingMember: data.reduce(
        (max, member) => (member["Total Spent"] > max["Total Spent"] ? member : max),
        data[0],
      ),
    },
    data,
  }
}

const generateAttendancePerSessionReport = (sessions: any[]): ReportData => {
  const data = sessions.map((session) => ({
    "Session ID": session.id,
    Date: new Date(session.date).toLocaleDateString(),
    Type: session.type,
    Trainer: session.trainer,
    Capacity: session.capacity || 1,
    Booked: session.booked || 1,
    "Attendance Rate": Math.round(((session.booked || 1) / (session.capacity || 1)) * 100),
    Status: normalizeStatus(session.status),
  }))

  const totalCapacity = data.reduce((sum, session) => sum + session.Capacity, 0)
  const totalBooked = data.reduce((sum, session) => sum + session.Booked, 0)

  return {
    title: "Attendance per Session Report",
    summary: {
      totalSessions: sessions.length,
      overallAttendanceRate: Math.round((totalBooked / totalCapacity) * 100),
      averageCapacity: Math.round(totalCapacity / sessions.length),
      averageBooked: Math.round(totalBooked / sessions.length),
    },
    data,
  }
}

// Export report to Excel
export const exportToExcel = (reportData: ReportData, filename: string): Blob => {
  const workbook = XLSX.utils.book_new()

  // Create summary sheet
  const summaryData = Object.entries(reportData.summary).map(([key, value]) => ({
    Metric: key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
    Value: value,
  }))

  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

  // Create data sheet
  const dataSheet = XLSX.utils.json_to_sheet(reportData.data)
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Data")

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}
