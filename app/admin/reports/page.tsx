"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	TrendingUp,
	Users,
	Calendar,
	Package,
	DollarSign,
	Activity,
	Clock,
	Target,
	BarChart3,
	Zap,
	RefreshCw,
	ChevronDown,
	ChevronRight,
	User,
	Mail,
	CheckCircle,
	XCircle,
	AlertCircle,
	Calendar as CalendarIcon,
	Download,
	FileText,
	Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/page-header";
import { useTheme } from "@/components/theme-provider";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	LineChart,
	Line,
	Area,
	AreaChart,
} from "recharts";

interface DashboardStats {
	totalMembers: number;
	activeMembers: number;
	totalSessions: number;
	upcomingSessions: number;
	completedSessions: number;
	totalRevenue: number;
	monthlyRevenue: number;
	attendanceRate: number;
	averageSessionCapacity: number;
	topPackage: string;
	growthRate: number;
}

interface RevenueData {
	name: string;
	revenue: number;
	count: number;
}

interface SessionStatusData {
	status: string;
	count: number;
	percentage: number;
}

interface DailyRevenueData {
	date: string;
	revenue: number;
	sessions: number;
}

interface MemberGrowthData {
	month: string;
	newMembers: number;
	totalMembers: number;
}

interface AttendanceData {
	sessionTitle: string;
	date: string;
	capacity: number;
	booked: number;
	attended: number;
	attendanceRate: number;
}

interface PackageMemberDetail {
	memberId: string;
	memberName: string;
	memberEmail: string;
	packageId: string;
	status: string;
	startDate: string;
	endDate: string;
	sessionsRemaining: number;
	sessionTotal: number;
	packagePrice: number;
	paymentStatus: "paid" | "unpaid" | "pending";
	paymentAmount: number;
	paymentDate?: string;
	transactionId?: string;
	purchaseDate: string;
}

interface PackagePopularityData {
	packageName: string;
	packageId: string;
	activeCount: number;
	totalCount: number;
	totalRevenue: number;
	potentialRevenue: number;
	averagePrice: number;
	completedPackages: number;
	conversionRate: number;
	paidCount: number;
	unpaidCount: number;
	memberDetails: PackageMemberDetail[];
}

const COLORS = [
	"#0088FE",
	"#00C49F",
	"#FFBB28",
	"#FF8042",
	"#8884d8",
	"#82ca9d",
	"#ffc658",
	"#ff7300",
];

export default function ReportsPage() {
	const router = useRouter();
	const { toast } = useToast();
	const auth = useAuth();
	const { theme } = useTheme();
	const [isLoading, setIsLoading] = useState(true);
	const [stats, setStats] = useState<DashboardStats>({
		totalMembers: 0,
		activeMembers: 0,
		totalSessions: 0,
		upcomingSessions: 0,
		completedSessions: 0,
		totalRevenue: 0,
		monthlyRevenue: 0,
		attendanceRate: 0,
		averageSessionCapacity: 0,
		topPackage: "",
		growthRate: 0,
	});

	const [revenueByPackage, setRevenueByPackage] = useState<RevenueData[]>([]);
	const [sessionStatusData, setSessionStatusData] = useState<
		SessionStatusData[]
	>([]);
	const [dailyRevenue, setDailyRevenue] = useState<DailyRevenueData[]>([]);
	const [memberGrowth, setMemberGrowth] = useState<MemberGrowthData[]>([]);
	const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
	const [packagePopularity, setPackagePopularity] = useState<
		PackagePopularityData[]
	>([]);
	const [expandedPackages, setExpandedPackages] = useState<Set<string>>(
		new Set()
	);

	// Export and date filtering state
	const [dateFrom, setDateFrom] = useState(() => {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		return thirtyDaysAgo.toISOString().split("T")[0];
	});
	const [dateTo, setDateTo] = useState(() => {
		return new Date().toISOString().split("T")[0];
	});
	const [isExporting, setIsExporting] = useState(false);

	useEffect(() => {
		if (!auth.user) {
			router.push("/login");
			return;
		}
		loadReportsData();
	}, [router, auth.user]);

	// Reload data when date range changes
	useEffect(() => {
		if (auth.user && dateFrom && dateTo) {
			const timeoutId = setTimeout(() => {
				loadReportsData();
			}, 500); // Debounce to avoid too many API calls

			return () => clearTimeout(timeoutId);
		}
	}, [dateFrom, dateTo, auth.user]);

	const loadReportsData = async () => {
		try {
			setIsLoading(true);
			const supabase = createClient();

			// Get current date ranges
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const startOfLastMonth = new Date(
				now.getFullYear(),
				now.getMonth() - 1,
				1
			);
			const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
			const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			const last6Months = new Date(now.getFullYear(), now.getMonth() - 6, 1);

			// Use selected date range for filtering
			const filterFromDate = new Date(dateFrom);
			const filterToDate = new Date(dateTo);
			filterToDate.setHours(23, 59, 59, 999); // Include full end date

			// Load all data in parallel
			const [
				membersResult,
				sessionsResult,
				memberPackagesResult,
				paymentsResult,
				packagesResult,
			] = await Promise.allSettled([
				// Members data
				supabase
					.from("members")
					.select("id, membership_status, joined_at")
					.order("joined_at", { ascending: true }),

				// Sessions data
				supabase
					.from("sessions")
					.select(
						"id, title, start_time, end_time, status, current_bookings, max_capacity"
					)
					.order("start_time", { ascending: false }),

				// Member packages for revenue analysis
				supabase
					.from("member_packages")
					.select(
						`
            id, start_date, end_date, sessions_remaining, sessions_total, status, created_at, member_id,
            packages (id, name, price, session_count),
            members (id, joined_at, membership_status, profiles (full_name, email))
          `
					)
					.order("created_at", { ascending: false }),

				// Payments data (broader date range to ensure we get payment data)
				supabase
					.from("payments")
					.select(
						"amount, status, payment_date, created_at, transaction_id, member_id, package_id"
					)
					.order("payment_date", { ascending: true }),

				// Packages data
				supabase
					.from("packages")
					.select("id, name, price, session_count, package_type_id, is_active"),
			]);

			// Process data
			const members =
				(membersResult.status === "fulfilled"
					? membersResult.value.data
					: []) || [];
			const sessions =
				(sessionsResult.status === "fulfilled"
					? sessionsResult.value.data
					: []) || [];
			const memberPackages =
				(memberPackagesResult.status === "fulfilled"
					? memberPackagesResult.value.data
					: []) || [];
			const payments =
				(paymentsResult.status === "fulfilled"
					? paymentsResult.value.data
					: []) || [];
			const packages =
				(packagesResult.status === "fulfilled"
					? packagesResult.value.data
					: []) || [];

			// Calculate stats
			const activeMembers = members.filter(
				(m: any) => m.membership_status === "active"
			);
			const upcomingSessions = sessions.filter(
				(s: any) => new Date(s.start_time) > now && s.status === "scheduled"
			);
			const completedSessions = sessions.filter(
				(s: any) => new Date(s.start_time) < now && s.status !== "cancelled"
			);

			// Calculate revenue
			const totalRevenue = payments.reduce(
				(sum: number, payment: any) => sum + (Number(payment.amount) || 0),
				0
			);
			const monthlyPayments = payments.filter((p: any) => {
				const paymentDate = new Date(p.payment_date || p.created_at);
				return paymentDate >= startOfMonth && paymentDate <= now;
			});
			const monthlyRevenue = monthlyPayments.reduce(
				(sum: number, payment: any) => sum + (Number(payment.amount) || 0),
				0
			);

			// Calculate attendance rate
			const sessionsWithBookings = sessions.filter(
				(s: any) => s.current_bookings > 0
			);
			const totalCapacity = sessionsWithBookings.reduce(
				(sum: number, s: any) => sum + (s.max_capacity || 0),
				0
			);
			const totalBooked = sessionsWithBookings.reduce(
				(sum: number, s: any) => sum + (s.current_bookings || 0),
				0
			);
			const attendanceRate =
				totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

			// Calculate average session capacity utilization
			const averageSessionCapacity =
				sessionsWithBookings.length > 0
					? Math.round(
							sessionsWithBookings.reduce(
								(sum: number, s: any) =>
									sum + (s.current_bookings / (s.max_capacity || 1)) * 100,
								0
							) / sessionsWithBookings.length
					  )
					: 0;

			// Calculate member growth rate (total members at end of current month vs end of last month)
			const totalMembersEndOfCurrentMonth = members.filter((m: any) => {
				const joinDate = new Date(m.joined_at);
				return joinDate <= now;
			}).length;

			const totalMembersEndOfLastMonth = members.filter((m: any) => {
				const joinDate = new Date(m.joined_at);
				return joinDate <= endOfLastMonth;
			}).length;

			const growthRate =
				totalMembersEndOfLastMonth > 0
					? Math.round(
							((totalMembersEndOfCurrentMonth - totalMembersEndOfLastMonth) /
								totalMembersEndOfLastMonth) *
								100
					  )
					: totalMembersEndOfCurrentMonth > 0
					? 100
					: 0;

			// Find top package
			const packageCounts: { [key: string]: number } = {};
			memberPackages.forEach((mp: any) => {
				const packageName = mp.packages?.name || "Unknown";
				packageCounts[packageName] = (packageCounts[packageName] || 0) + 1;
			});
			const topPackage =
				Object.keys(packageCounts).reduce((a, b) =>
					packageCounts[a] > packageCounts[b] ? a : b
				) || "None";

			setStats({
				totalMembers: members.length,
				activeMembers: activeMembers.length,
				totalSessions: sessions.length,
				upcomingSessions: upcomingSessions.length,
				completedSessions: completedSessions.length,
				totalRevenue,
				monthlyRevenue,
				attendanceRate,
				averageSessionCapacity,
				topPackage,
				growthRate,
			});

			// Process revenue by package
			const revenueByPkg: {
				[key: string]: { revenue: number; count: number };
			} = {};
			memberPackages.forEach((mp: any) => {
				const packageName = mp.packages?.name || "Unknown";
				const price = Number(mp.packages?.price) || 0;
				if (!revenueByPkg[packageName]) {
					revenueByPkg[packageName] = { revenue: 0, count: 0 };
				}
				revenueByPkg[packageName].revenue += price;
				revenueByPkg[packageName].count += 1;
			});

			setRevenueByPackage(
				Object.entries(revenueByPkg).map(([name, data]) => ({
					name,
					revenue: data.revenue,
					count: data.count,
				}))
			);

			// Process session status data
			const statusCounts: { [key: string]: number } = {};
			sessions.forEach((s: any) => {
				statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
			});

			const statusData = Object.entries(statusCounts).map(
				([status, count]) => ({
					status,
					count: count as number,
					percentage: Math.round(((count as number) / sessions.length) * 100),
				})
			);
			setSessionStatusData(statusData);

			// Process daily revenue for last 30 days
			const dailyRevenueMap: {
				[key: string]: { revenue: number; sessions: number };
			} = {};

			// Initialize all days with 0
			for (let i = 29; i >= 0; i--) {
				const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
				const dateStr = date.toISOString().split("T")[0];
				dailyRevenueMap[dateStr] = { revenue: 0, sessions: 0 };
			}

			// Add payment data
			payments
				.filter((p: any) => {
					const paymentDate = new Date(p.payment_date || p.created_at);
					return paymentDate >= last30Days;
				})
				.forEach((p: any) => {
					const date = new Date(p.payment_date || p.created_at)
						.toISOString()
						.split("T")[0];
					if (dailyRevenueMap[date]) {
						dailyRevenueMap[date].revenue += Number(p.amount) || 0;
					}
				});

			// Add session data
			sessions
				.filter((s: any) => new Date(s.start_time) >= last30Days)
				.forEach((s: any) => {
					const date = new Date(s.start_time).toISOString().split("T")[0];
					if (dailyRevenueMap[date]) {
						dailyRevenueMap[date].sessions += 1;
					}
				});

			setDailyRevenue(
				Object.entries(dailyRevenueMap)
					.map(([date, data]) => ({
						date: new Date(date).toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
						}),
						revenue: data.revenue,
						sessions: data.sessions,
					}))
					.slice(-30)
			);

			// Process member growth for last 6 months
			const monthlyGrowth: { [key: string]: { new: number; total: number } } =
				{};

			for (let i = 5; i >= 0; i--) {
				const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
				const monthKey = date.toISOString().substr(0, 7);
				const monthName = date.toLocaleDateString("en-US", {
					month: "short",
					year: "numeric",
				});
				monthlyGrowth[monthName] = { new: 0, total: 0 };
			}

			let cumulativeMembers = 0;
			Object.keys(monthlyGrowth).forEach((monthName, index) => {
				const monthDate = new Date(
					now.getFullYear(),
					now.getMonth() - (5 - index),
					1
				);
				const nextMonthDate = new Date(
					now.getFullYear(),
					now.getMonth() - (5 - index) + 1,
					1
				);

				const newMembersThisMonth = members.filter((m: any) => {
					const joinDate = new Date(m.joined_at);
					return joinDate >= monthDate && joinDate < nextMonthDate;
				}).length;

				const totalMembersUpToThisMonth = members.filter((m: any) => {
					const joinDate = new Date(m.joined_at);
					return joinDate < nextMonthDate;
				}).length;

				monthlyGrowth[monthName] = {
					new: newMembersThisMonth,
					total: totalMembersUpToThisMonth,
				};
			});

			setMemberGrowth(
				Object.entries(monthlyGrowth).map(([month, data]) => ({
					month,
					newMembers: data.new,
					totalMembers: data.total,
				}))
			);

			// Process attendance data (top 10 recent sessions)
			const recentSessions = sessions
				.filter((s: any) => new Date(s.start_time) < now)
				.slice(0, 10);

			const attendanceInfo = recentSessions.map((s: any) => ({
				sessionTitle: s.title,
				date: new Date(s.start_time).toLocaleDateString(),
				capacity: s.max_capacity || 0,
				booked: s.current_bookings || 0,
				attended: Math.floor((s.current_bookings || 0) * 0.85), // Estimate 85% attendance
				attendanceRate: s.current_bookings
					? Math.round(
							(Math.floor((s.current_bookings || 0) * 0.85) /
								s.current_bookings) *
								100
					  )
					: 0,
			}));
			setAttendanceData(attendanceInfo);

			// Process detailed package popularity with member information
			const packageDetailsMap: {
				[key: string]: {
					packageId: string;
					packageName: string;
					activeCount: number;
					totalCount: number;
					actualRevenue: number;
					potentialRevenue: number;
					prices: number[];
					completedPackages: number;
					paidCount: number;
					unpaidCount: number;
					memberDetails: PackageMemberDetail[];
				};
			} = {};

			// First, process all member packages to collect detailed information
			memberPackages.forEach((mp: any) => {
				const packageName = mp.packages?.name || "Unknown";
				const packageId = mp.packages?.id || "unknown";
				const price = Number(mp.packages?.price) || 0;
				const isActive = mp.status === "active";
				const isCompleted =
					mp.status === "completed" || mp.status === "expired";

				// Initialize package entry if it doesn't exist
				if (!packageDetailsMap[packageName]) {
					packageDetailsMap[packageName] = {
						packageId,
						packageName,
						activeCount: 0,
						totalCount: 0,
						actualRevenue: 0,
						potentialRevenue: 0,
						prices: [],
						completedPackages: 0,
						paidCount: 0,
						unpaidCount: 0,
						memberDetails: [],
					};
				}

				// Find corresponding payment for this member package
				const memberPayment = payments.find(
					(p: any) => p.member_id === mp.member_id && p.package_id === packageId
				);

				const paymentStatus: "paid" | "unpaid" | "pending" =
					memberPayment?.status === "completed"
						? "paid"
						: memberPayment?.status === "pending"
						? "pending"
						: "unpaid";

				const paymentAmount = memberPayment
					? Number(memberPayment.amount) || 0
					: 0;

				// Create detailed member information
				const memberDetail: PackageMemberDetail = {
					memberId: mp.member_id,
					memberName: mp.members?.profiles?.full_name || "Unknown Member",
					memberEmail: mp.members?.profiles?.email || "Unknown Email",
					packageId: packageId,
					status: mp.status || "unknown",
					startDate: mp.start_date || "",
					endDate: mp.end_date || "",
					sessionsRemaining: mp.sessions_remaining || 0,
					sessionTotal: mp.sessions_total || 0,
					packagePrice: price,
					paymentStatus,
					paymentAmount,
					paymentDate: memberPayment?.payment_date || memberPayment?.created_at,
					transactionId: memberPayment?.transaction_id,
					purchaseDate: mp.created_at || "",
				};

				// Add to package stats
				const pkg = packageDetailsMap[packageName];
				pkg.totalCount += 1;
				pkg.prices.push(price);
				pkg.potentialRevenue += price;
				pkg.memberDetails.push(memberDetail);

				if (isActive) {
					pkg.activeCount += 1;
				}

				if (isCompleted) {
					pkg.completedPackages += 1;
				}

				if (paymentStatus === "paid") {
					pkg.paidCount += 1;
					pkg.actualRevenue += paymentAmount;
				} else {
					pkg.unpaidCount += 1;
				}
			});

			// Format final data with detailed member information
			const packagePopularityData = Object.values(packageDetailsMap)
				.map((pkg) => {
					const conversionRate =
						pkg.totalCount > 0
							? Math.round((pkg.paidCount / pkg.totalCount) * 100)
							: 0;

					// Sort member details by payment status (paid first) then by purchase date
					pkg.memberDetails.sort((a, b) => {
						if (a.paymentStatus === "paid" && b.paymentStatus !== "paid")
							return -1;
						if (a.paymentStatus !== "paid" && b.paymentStatus === "paid")
							return 1;
						return (
							new Date(b.purchaseDate).getTime() -
							new Date(a.purchaseDate).getTime()
						);
					});

					return {
						packageName: pkg.packageName,
						packageId: pkg.packageId,
						activeCount: pkg.activeCount,
						totalCount: pkg.totalCount,
						totalRevenue: pkg.actualRevenue,
						potentialRevenue: pkg.potentialRevenue,
						averagePrice:
							pkg.prices.length > 0
								? Math.round(
										pkg.prices.reduce((a, b) => a + b, 0) / pkg.prices.length
								  )
								: 0,
						completedPackages: pkg.completedPackages,
						conversionRate: isNaN(conversionRate) ? 0 : conversionRate,
						paidCount: pkg.paidCount,
						unpaidCount: pkg.unpaidCount,
						memberDetails: pkg.memberDetails,
					};
				})
				.filter((pkg) => pkg.totalCount > 0) // Only show packages that have been used
				.sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by actual revenue desc

			setPackagePopularity(packagePopularityData);
		} catch (error) {
			console.error("Error loading reports data:", error);
			toast({
				title: "Error",
				description: "Failed to load reports data. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	// Export functionality
	const downloadCSV = (data: any[], filename: string) => {
		if (data.length === 0) {
			toast({
				title: "No Data",
				description: "No data available for the selected date range.",
				variant: "destructive",
			});
			return;
		}

		const headers = Object.keys(data[0]);
		const csvContent = [
			headers.join(","),
			...data.map((row) =>
				headers
					.map((header) => {
						const value = row[header];
						// Handle CSV escaping
						if (
							typeof value === "string" &&
							(value.includes(",") ||
								value.includes('"') ||
								value.includes("\n"))
						) {
							return `"${value.replace(/"/g, '""')}"`;
						}
						return value || "";
					})
					.join(",")
			),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `${filename}_${dateFrom}_to_${dateTo}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const filterDataByDateRange = (data: any[], dateField: string) => {
		const fromDate = new Date(dateFrom);
		const toDate = new Date(dateTo);
		toDate.setHours(23, 59, 59, 999); // Include full end date

		return data.filter((item) => {
			const itemDate = new Date(item[dateField]);
			return itemDate >= fromDate && itemDate <= toDate;
		});
	};

	const exportPackageReport = async () => {
		try {
			setIsExporting(true);
			const exportData = packagePopularity.flatMap((pkg) =>
				pkg.memberDetails.map((member) => ({
					"Package Name": pkg.packageName,
					"Member Name": member.memberName,
					"Member Email": member.memberEmail,
					"Package Price": member.packagePrice,
					"Payment Amount": member.paymentAmount,
					"Payment Status": member.paymentStatus,
					"Payment Date": member.paymentDate || "Not Paid",
					"Purchase Date": member.purchaseDate,
					"Member Status": member.status,
					"Sessions Remaining": member.sessionsRemaining,
					"Total Sessions": member.sessionTotal,
					"Transaction ID": member.transactionId || "N/A",
				}))
			);

			// Filter by purchase date
			const filteredData = filterDataByDateRange(exportData, "Purchase Date");
			downloadCSV(filteredData, "package_report");
		} catch (error) {
			toast({
				title: "Export Error",
				description: "Failed to export package report.",
				variant: "destructive",
			});
		} finally {
			setIsExporting(false);
		}
	};

	const exportRevenueReport = async () => {
		try {
			setIsExporting(true);
			const exportData = packagePopularity.map((pkg) => ({
				"Package Name": pkg.packageName,
				"Total Sales": pkg.totalCount,
				"Active Packages": pkg.activeCount,
				"Paid Count": pkg.paidCount,
				"Unpaid Count": pkg.unpaidCount,
				"Total Revenue": pkg.totalRevenue,
				"Potential Revenue": pkg.potentialRevenue,
				"Outstanding Amount": pkg.potentialRevenue - pkg.totalRevenue,
				"Average Price": pkg.averagePrice,
				"Payment Rate (%)": pkg.conversionRate,
				"Completed Packages": pkg.completedPackages,
			}));

			downloadCSV(exportData, "revenue_report");
		} catch (error) {
			toast({
				title: "Export Error",
				description: "Failed to export revenue report.",
				variant: "destructive",
			});
		} finally {
			setIsExporting(false);
		}
	};

	const exportSessionReport = async () => {
		try {
			setIsExporting(true);
			const exportData = attendanceData.map((session) => ({
				"Session Title": session.sessionTitle,
				Date: session.date,
				Capacity: session.capacity,
				Booked: session.booked,
				Attended: session.attended,
				"Attendance Rate (%)": session.attendanceRate,
				"Utilization (%)": Math.round(
					(session.booked / session.capacity) * 100
				),
			}));

			downloadCSV(exportData, "session_report");
		} catch (error) {
			toast({
				title: "Export Error",
				description: "Failed to export session report.",
				variant: "destructive",
			});
		} finally {
			setIsExporting(false);
		}
	};

	const exportDailyRevenueReport = async () => {
		try {
			setIsExporting(true);
			const fromDate = new Date(dateFrom);
			const toDate = new Date(dateTo);

			const filteredRevenue = dailyRevenue.filter((item) => {
				const itemDate = new Date(item.date);
				return itemDate >= fromDate && itemDate <= toDate;
			});

			const exportData = filteredRevenue.map((item) => ({
				Date: item.date,
				Revenue: item.revenue,
				Sessions: item.sessions,
			}));

			downloadCSV(exportData, "daily_revenue_report");
		} catch (error) {
			toast({
				title: "Export Error",
				description: "Failed to export daily revenue report.",
				variant: "destructive",
			});
		} finally {
			setIsExporting(false);
		}
	};

	if (!auth.user) {
		return (
			<div className="container mx-auto py-6">
				<div className="text-center">Loading...</div>
			</div>
		);
	}

	return (
		<AdminRoute>
			<PageHeader
				title="Analytics & Reports"
				subtitle="Real-time insights and performance metrics"
				icon={BarChart3}
				hasAddButton={false}
			/>
			<div className="container mx-auto max-w-7xl py-6 space-y-6 px-4">
				{/* Date Range and Export Controls */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
					{/* Date Range Selector */}
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
						<div className="flex items-center gap-2 text-sm">
							<Filter className="h-4 w-4 text-muted-foreground" />
							<Label htmlFor="dateFrom" className="text-sm font-medium">
								From:
							</Label>
							<Input
								id="dateFrom"
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								className="w-auto"
							/>
							<Label htmlFor="dateTo" className="text-sm font-medium">
								To:
							</Label>
							<Input
								id="dateTo"
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								className="w-auto"
							/>
						</div>

						{/* Quick Date Presets */}
						<div className="flex gap-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									const today = new Date();
									const weekAgo = new Date();
									weekAgo.setDate(today.getDate() - 7);
									setDateFrom(weekAgo.toISOString().split("T")[0]);
									setDateTo(today.toISOString().split("T")[0]);
								}}
								className="text-xs h-7 px-2">
								7d
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									const today = new Date();
									const monthAgo = new Date();
									monthAgo.setDate(today.getDate() - 30);
									setDateFrom(monthAgo.toISOString().split("T")[0]);
									setDateTo(today.toISOString().split("T")[0]);
								}}
								className="text-xs h-7 px-2">
								30d
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									const today = new Date();
									const monthsAgo = new Date();
									monthsAgo.setMonth(today.getMonth() - 3);
									setDateFrom(monthsAgo.toISOString().split("T")[0]);
									setDateTo(today.toISOString().split("T")[0]);
								}}
								className="text-xs h-7 px-2">
								3m
							</Button>
						</div>
					</div>

					{/* Export Options */}
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									disabled={isExporting}
									className="gap-2">
									<Download className="h-4 w-4" />
									Export Reports
									<ChevronDown className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuItem
									onClick={exportPackageReport}
									disabled={isExporting}>
									<FileText className="h-4 w-4 mr-2" />
									Package Details Report
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={exportRevenueReport}
									disabled={isExporting}>
									<DollarSign className="h-4 w-4 mr-2" />
									Revenue Summary Report
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={exportSessionReport}
									disabled={isExporting}>
									<Calendar className="h-4 w-4 mr-2" />
									Session Attendance Report
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={exportDailyRevenueReport}
									disabled={isExporting}>
									<TrendingUp className="h-4 w-4 mr-2" />
									Daily Revenue Report
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<Button
							onClick={loadReportsData}
							disabled={isLoading}
							variant="outline">
							<RefreshCw
								className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
							/>
							Refresh
						</Button>
					</div>
				</div>

				{/* Date Range Indicator */}
				<div className="bg-muted/50 rounded-lg p-3 text-center">
					<p className="text-sm text-muted-foreground">
						Showing data from{" "}
						<span className="font-medium">
							{new Date(dateFrom).toLocaleDateString()}
						</span>{" "}
						to{" "}
						<span className="font-medium">
							{new Date(dateTo).toLocaleDateString()}
						</span>
					</p>
				</div>

				{/* Key Metrics */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total Revenue
							</CardTitle>
							<DollarSign className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{formatCurrency(stats.totalRevenue)}
							</div>
							<p className="text-xs text-muted-foreground">
								<span className="text-green-600">
									{formatCurrency(stats.monthlyRevenue)} this month
								</span>
							</p>
							<Progress
								value={(stats.monthlyRevenue / stats.totalRevenue) * 100}
								className="mt-2"
							/>
						</CardContent>
					</Card>

					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Members</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.totalMembers}</div>
							<p className="text-xs text-muted-foreground">
								<span className="text-green-600">
									{stats.activeMembers} active
								</span>
								{stats.growthRate !== 0 && (
									<span
										className={`ml-2 ${
											stats.growthRate > 0 ? "text-green-600" : "text-red-600"
										}`}>
										{stats.growthRate > 0 ? "+" : ""}
										{stats.growthRate}% growth
									</span>
								)}
							</p>
							<Progress
								value={(stats.activeMembers / stats.totalMembers) * 100}
								className="mt-2"
							/>
						</CardContent>
					</Card>

					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Sessions</CardTitle>
							<Calendar className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.totalSessions}</div>
							<p className="text-xs text-muted-foreground">
								<span className="text-blue-600">
									{stats.upcomingSessions} upcoming
								</span>
								<span className="ml-2 text-green-600">
									{stats.completedSessions} completed
								</span>
							</p>
							<Progress
								value={(stats.completedSessions / stats.totalSessions) * 100}
								className="mt-2"
							/>
						</CardContent>
					</Card>

					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Attendance Rate
							</CardTitle>
							<Target className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.attendanceRate}%</div>
							<p className="text-xs text-muted-foreground">
								<span className="text-purple-600">
									{stats.averageSessionCapacity}% avg capacity
								</span>
							</p>
							<Progress value={stats.attendanceRate} className="mt-2" />
						</CardContent>
					</Card>
				</div>

				{/* Charts Row 1 */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Revenue by Package - Enhanced */}
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Package className="h-5 w-5" />
								Revenue by Package
							</CardTitle>
							<CardDescription>
								Revenue breakdown with payment status and performance metrics
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Chart */}
							<ResponsiveContainer width="100%" height={280}>
								<BarChart data={revenueByPackage}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis
										dataKey="name"
										tick={{ fontSize: 12 }}
										angle={-45}
										textAnchor="end"
										height={80}
									/>
									<YAxis tick={{ fontSize: 12 }} />
									<Tooltip
										formatter={(value: any, name: string) => [
											name === "revenue" ? formatCurrency(value) : value,
											name === "revenue" ? "Revenue" : "Count",
										]}
									/>
									<Legend />
									<Bar dataKey="revenue" fill="#0088FE" name="Revenue" />
									<Bar dataKey="count" fill="#00C49F" name="Count" />
								</BarChart>
							</ResponsiveContainer>

							{/* Package Details Table */}
							<div className="space-y-3">
								<h4 className="font-medium text-sm">
									Package Performance Details
								</h4>
								<div className="space-y-2">
									<div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
										<div>Package</div>
										<div>Sales</div>
										<div>Revenue</div>
										<div>Avg Price</div>
										<div>Payment Rate</div>
										<div>Status</div>
									</div>
									{packagePopularity.slice(0, 5).map((pkg, index) => (
										<div
											key={index}
											className="grid grid-cols-6 gap-2 text-xs items-center py-1">
											<div
												className="font-medium truncate"
												title={pkg.packageName}>
												{pkg.packageName}
											</div>
											<div className="flex items-center gap-1">
												<Badge variant="outline" className="text-xs px-1 py-0">
													{pkg.totalCount}
												</Badge>
											</div>
											<div className="font-medium text-green-600">
												{formatCurrency(pkg.totalRevenue)}
											</div>
											<div className="text-muted-foreground">
												{formatCurrency(pkg.averagePrice)}
											</div>
											<div className="flex items-center gap-1">
												<div className="w-8 bg-gray-200 rounded-full h-1.5">
													<div
														className="bg-blue-600 h-1.5 rounded-full"
														style={{
															width: `${Math.min(pkg.conversionRate, 100)}%`,
														}}></div>
												</div>
												<span className="text-xs">{pkg.conversionRate}%</span>
											</div>
											<div className="flex items-center gap-1">
												<div className="flex items-center gap-1">
													<div className="w-2 h-2 bg-green-500 rounded-full"></div>
													<span className="text-green-600">
														{pkg.paidCount}
													</span>
												</div>
												{pkg.unpaidCount > 0 && (
													<div className="flex items-center gap-1">
														<div className="w-2 h-2 bg-red-500 rounded-full"></div>
														<span className="text-red-600">
															{pkg.unpaidCount}
														</span>
													</div>
												)}
											</div>
										</div>
									))}
									{packagePopularity.length > 5 && (
										<div className="text-center pt-2">
											<p className="text-xs text-muted-foreground">
												Showing top 5 packages. See detailed view below for all
												packages.
											</p>
										</div>
									)}
								</div>
							</div>

							{/* Summary Stats */}
							<div className="grid grid-cols-3 gap-4 pt-3 border-t">
								<div className="text-center">
									<div className="text-lg font-bold text-blue-600">
										{formatCurrency(
											packagePopularity.reduce(
												(sum, pkg) => sum + pkg.totalRevenue,
												0
											)
										)}
									</div>
									<p className="text-xs text-muted-foreground">
										Total Collected
									</p>
								</div>
								<div className="text-center">
									<div className="text-lg font-bold text-orange-600">
										{formatCurrency(
											packagePopularity.reduce(
												(sum, pkg) =>
													sum + (pkg.potentialRevenue - pkg.totalRevenue),
												0
											)
										)}
									</div>
									<p className="text-xs text-muted-foreground">Outstanding</p>
								</div>
								<div className="text-center">
									<div className="text-lg font-bold text-green-600">
										{packagePopularity.length > 0
											? Math.round(
													packagePopularity.reduce(
														(sum, pkg) => sum + pkg.conversionRate,
														0
													) / packagePopularity.length
											  )
											: 0}
										%
									</div>
									<p className="text-xs text-muted-foreground">
										Avg Payment Rate
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Session Status */}
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Activity className="h-5 w-5" />
								Session Status Distribution
							</CardTitle>
							<CardDescription>
								Breakdown of sessions by current status
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={sessionStatusData}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={(entry) => `${entry.status} (${entry.percentage}%)`}
										outerRadius={80}
										fill="#8884d8"
										dataKey="count">
										{sessionStatusData.map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={COLORS[index % COLORS.length]}
											/>
										))}
									</Pie>
									<Tooltip />
								</PieChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</div>

				{/* Charts Row 2 */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Daily Revenue Trend */}
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<TrendingUp className="h-5 w-5" />
								Daily Revenue Trend (Last 30 Days)
							</CardTitle>
							<CardDescription>
								Revenue and session activity over time
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<AreaChart data={dailyRevenue}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis
										dataKey="date"
										tick={{ fontSize: 12 }}
										angle={-45}
										textAnchor="end"
										height={60}
									/>
									<YAxis yAxisId="left" tick={{ fontSize: 12 }} />
									<YAxis
										yAxisId="right"
										orientation="right"
										tick={{ fontSize: 12 }}
									/>
									<Tooltip
										formatter={(value: any, name: string) => [
											name === "revenue" ? formatCurrency(value) : value,
											name === "revenue" ? "Revenue" : "Sessions",
										]}
									/>
									<Legend />
									<Area
										yAxisId="left"
										type="monotone"
										dataKey="revenue"
										stackId="1"
										stroke="#0088FE"
										fill="#0088FE"
										fillOpacity={0.6}
										name="Revenue"
									/>
									<Line
										yAxisId="right"
										type="monotone"
										dataKey="sessions"
										stroke="#FF8042"
										strokeWidth={2}
										name="Sessions"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					{/* Member Growth */}
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Users className="h-5 w-5" />
								Member Growth (Last 6 Months)
							</CardTitle>
							<CardDescription>
								New member registrations and total growth
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
								<LineChart data={memberGrowth}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="month" tick={{ fontSize: 12 }} />
									<YAxis tick={{ fontSize: 12 }} />
									<Tooltip />
									<Legend />
									<Bar
										dataKey="newMembers"
										fill="#00C49F"
										name="New Members"
										opacity={0.7}
									/>
									<Line
										type="monotone"
										dataKey="totalMembers"
										stroke="#8884d8"
										strokeWidth={3}
										name="Total Members"
									/>
								</LineChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</div>

				{/* Recent Session Attendance */}
				<Card className="rounded-2xl shadow-xl dark:bg-background/80">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Clock className="h-5 w-5" />
							Recent Session Attendance
						</CardTitle>
						<CardDescription>
							Performance metrics for recent sessions
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
								<div>Session</div>
								<div>Date</div>
								<div>Capacity</div>
								<div>Attended</div>
								<div>Rate</div>
							</div>
							{attendanceData.slice(0, 8).map((session, index) => (
								<div key={index} className="grid grid-cols-5 gap-2 text-sm">
									<div
										className="font-medium truncate"
										title={session.sessionTitle}>
										{session.sessionTitle}
									</div>
									<div>{session.date}</div>
									<div>
										{session.booked}/{session.capacity}
									</div>
									<div>{session.attended}</div>
									<div>
										<Badge
											variant={
												session.attendanceRate >= 80
													? "default"
													: session.attendanceRate >= 60
													? "secondary"
													: "destructive"
											}>
											{session.attendanceRate}%
										</Badge>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Package Popularity & Performance - Enhanced (Full Width) */}
				<Card className="rounded-2xl shadow-xl dark:bg-background/80 w-full overflow-hidden">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Zap className="h-5 w-5" />
							Package Popularity & Performance
						</CardTitle>
						<CardDescription>
							Detailed package metrics, revenue and payment status by member
						</CardDescription>
					</CardHeader>
					<CardContent>
						{packagePopularity.length === 0 ? (
							<div className="text-center py-8">
								<Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
								<p className="text-muted-foreground mb-2">
									No package data available
								</p>
								<p className="text-sm text-muted-foreground">
									Package statistics will appear when members purchase packages
								</p>
							</div>
						) : (
							<div className="space-y-6">
								{packagePopularity.map((pkg, index) => (
									<Collapsible
										key={pkg.packageId}
										open={expandedPackages.has(pkg.packageId)}
										onOpenChange={(isOpen) => {
											const newExpanded = new Set(expandedPackages);
											if (isOpen) {
												newExpanded.add(pkg.packageId);
											} else {
												newExpanded.delete(pkg.packageId);
											}
											setExpandedPackages(newExpanded);
										}}>
										<div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
											{/* Package Summary */}
											<CollapsibleTrigger asChild>
												<div className="flex flex-col lg:flex-row lg:items-center justify-between cursor-pointer gap-4">
													<div className="flex items-center gap-4 flex-1 min-w-0">
														<div className="flex items-center gap-2 flex-shrink-0">
															{expandedPackages.has(pkg.packageId) ? (
																<ChevronDown className="h-4 w-4" />
															) : (
																<ChevronRight className="h-4 w-4" />
															)}
															<h3 className="font-semibold text-lg truncate">
																{pkg.packageName}
															</h3>
														</div>
														<div className="flex flex-wrap items-center gap-3 text-sm min-w-0">
															<div className="flex items-center gap-2 flex-shrink-0">
																<Badge variant="secondary">
																	{pkg.totalCount} total sales
																</Badge>
																<Badge variant="outline">
																	{pkg.activeCount} active
																</Badge>
															</div>
															<div className="text-green-600 font-semibold flex-shrink-0">
																{formatCurrency(pkg.totalRevenue)} earned
															</div>
															<div className="text-muted-foreground flex-shrink-0">
																{formatCurrency(pkg.potentialRevenue)} potential
															</div>
														</div>
													</div>
													<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">
														<div className="flex items-center gap-4">
															<div className="flex items-center gap-2">
																<CheckCircle className="h-4 w-4 text-green-600" />
																<span className="text-sm font-medium text-green-600">
																	{pkg.paidCount} paid
																</span>
															</div>
															<div className="flex items-center gap-2">
																<XCircle className="h-4 w-4 text-red-600" />
																<span className="text-sm font-medium text-red-600">
																	{pkg.unpaidCount} unpaid
																</span>
															</div>
														</div>
														<div className="flex items-center gap-2">
															<div className="w-20 bg-gray-200 rounded-full h-2">
																<div
																	className="bg-blue-600 h-2 rounded-full transition-all duration-300"
																	style={{
																		width: `${Math.min(
																			pkg.conversionRate,
																			100
																		)}%`,
																	}}></div>
															</div>
															<span className="text-sm text-muted-foreground">
																{pkg.conversionRate}%
															</span>
														</div>
													</div>
												</div>
											</CollapsibleTrigger>

											{/* Detailed Member Payment Information */}
											<CollapsibleContent className="mt-4">
												<div className="space-y-4">
													<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
														{/* Paid Members */}
														<div>
															<h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
																<CheckCircle className="h-4 w-4" />
																Paid Members ({pkg.paidCount})
															</h4>
															<div className="space-y-2 max-h-60 overflow-y-auto overflow-x-hidden">
																{pkg.memberDetails
																	.filter(
																		(member) => member.paymentStatus === "paid"
																	)
																	.map((member, memberIndex) => (
																		<div
																			key={memberIndex}
																			className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
																			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
																				<div className="flex items-center gap-2">
																					<User className="h-4 w-4 text-green-600" />
																					<div>
																						<div className="font-medium">
																							{member.memberName}
																						</div>
																						<div className="text-xs text-muted-foreground flex items-center gap-1">
																							<Mail className="h-3 w-3" />
																							{member.memberEmail}
																						</div>
																					</div>
																				</div>
																				<div className="text-right">
																					<div className="font-semibold text-green-600">
																						{formatCurrency(
																							member.paymentAmount
																						)}
																					</div>
																					<div className="text-xs text-muted-foreground flex items-center gap-1">
																						<CalendarIcon className="h-3 w-3" />
																						{member.paymentDate
																							? new Date(
																									member.paymentDate
																							  ).toLocaleDateString()
																							: "N/A"}
																					</div>
																				</div>
																			</div>
																			<div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
																				<div>
																					Status:{" "}
																					<Badge
																						variant="outline"
																						className="text-xs">
																						{member.status}
																					</Badge>
																				</div>
																				<div>
																					Sessions: {member.sessionsRemaining}/
																					{member.sessionTotal}
																				</div>
																				{member.transactionId && (
																					<div>
																						TX:{" "}
																						{member.transactionId.slice(0, 8)}
																						...
																					</div>
																				)}
																			</div>
																		</div>
																	))}
																{pkg.memberDetails.filter(
																	(m) => m.paymentStatus === "paid"
																).length === 0 && (
																	<p className="text-sm text-muted-foreground text-center py-4">
																		No paid members yet
																	</p>
																)}
															</div>
														</div>

														{/* Unpaid Members */}
														<div>
															<h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
																<XCircle className="h-4 w-4" />
																Unpaid Members ({pkg.unpaidCount})
															</h4>
															<div className="space-y-2 max-h-60 overflow-y-auto overflow-x-hidden">
																{pkg.memberDetails
																	.filter(
																		(member) => member.paymentStatus !== "paid"
																	)
																	.map((member, memberIndex) => (
																		<div
																			key={memberIndex}
																			className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
																			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
																				<div className="flex items-center gap-2">
																					<User className="h-4 w-4 text-red-600" />
																					<div>
																						<div className="font-medium">
																							{member.memberName}
																						</div>
																						<div className="text-xs text-muted-foreground flex items-center gap-1">
																							<Mail className="h-3 w-3" />
																							{member.memberEmail}
																						</div>
																					</div>
																				</div>
																				<div className="text-right">
																					<div className="font-semibold text-red-600">
																						{formatCurrency(
																							member.packagePrice
																						)}{" "}
																						owed
																					</div>
																					<div className="text-xs text-muted-foreground">
																						<Badge
																							variant={
																								member.paymentStatus ===
																								"pending"
																									? "secondary"
																									: "destructive"
																							}
																							className="text-xs">
																							{member.paymentStatus}
																						</Badge>
																					</div>
																				</div>
																			</div>
																			<div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
																				<div>
																					Status:{" "}
																					<Badge
																						variant="outline"
																						className="text-xs">
																						{member.status}
																					</Badge>
																				</div>
																				<div>
																					Sessions: {member.sessionsRemaining}/
																					{member.sessionTotal}
																				</div>
																				<div className="flex items-center gap-1">
																					<CalendarIcon className="h-3 w-3" />
																					Purchased:{" "}
																					{new Date(
																						member.purchaseDate
																					).toLocaleDateString()}
																				</div>
																			</div>
																		</div>
																	))}
																{pkg.memberDetails.filter(
																	(m) => m.paymentStatus !== "paid"
																).length === 0 && (
																	<p className="text-sm text-muted-foreground text-center py-4">
																		All members have paid
																	</p>
																)}
															</div>
														</div>
													</div>

													{/* Package Summary Stats */}
													<div className="border-t pt-4 mt-4">
														<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
															<div>
																<div className="text-2xl font-bold text-blue-600">
																	{formatCurrency(pkg.totalRevenue)}
																</div>
																<div className="text-xs text-muted-foreground">
																	Revenue Collected
																</div>
															</div>
															<div>
																<div className="text-2xl font-bold text-orange-600">
																	{formatCurrency(
																		pkg.potentialRevenue - pkg.totalRevenue
																	)}
																</div>
																<div className="text-xs text-muted-foreground">
																	Outstanding Amount
																</div>
															</div>
															<div>
																<div className="text-2xl font-bold text-green-600">
																	{pkg.conversionRate}%
																</div>
																<div className="text-xs text-muted-foreground">
																	Payment Rate
																</div>
															</div>
															<div>
																<div className="text-2xl font-bold text-purple-600">
																	{formatCurrency(pkg.averagePrice)}
																</div>
																<div className="text-xs text-muted-foreground">
																	Average Price
																</div>
															</div>
														</div>
													</div>
												</div>
											</CollapsibleContent>
										</div>
									</Collapsible>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Summary Stats */}
				<Card className="rounded-2xl shadow-xl dark:bg-background/80">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BarChart3 className="h-5 w-5" />
							Quick Insights
						</CardTitle>
						<CardDescription>
							Key performance indicators and trends
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="text-center">
								<div className="text-3xl font-bold text-blue-600">
									{stats.topPackage}
								</div>
								<p className="text-sm text-muted-foreground">
									Most Popular Package
								</p>
							</div>
							<div className="text-center">
								<div className="text-3xl font-bold text-green-600">
									{stats.averageSessionCapacity}%
								</div>
								<p className="text-sm text-muted-foreground">
									Average Session Utilization
								</p>
							</div>
							<div className="text-center">
								<div className="text-3xl font-bold text-purple-600">
									{stats.growthRate > 0 ? "+" : ""}
									{stats.growthRate}%
								</div>
								<p className="text-sm text-muted-foreground">
									Monthly Growth Rate
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</AdminRoute>
	);
}
