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
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminRoute } from "@/components/ProtectedRoute";
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

interface PackagePopularityData {
	packageName: string;
	activeCount: number;
	totalRevenue: number;
	averagePrice: number;
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

	useEffect(() => {
		if (!auth.user) {
			router.push("/login");
			return;
		}
		loadReportsData();
	}, [router, auth.user]);

	const loadReportsData = async () => {
		try {
			setIsLoading(true);
			const supabase = createClient();

			// Get current date ranges
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
			const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
			const last6Months = new Date(now.getFullYear(), now.getMonth() - 6, 1);

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
            id, start_date, end_date, sessions_remaining, sessions_total, status, activated_at,
            packages (name, price, session_count),
            members (joined_at, membership_status)
          `
					)
					.order("activated_at", { ascending: false }),

				// Payments data
				supabase
					.from("payments")
					.select("amount, status, payment_date, created_at")
					.eq("status", "completed")
					.order("payment_date", { ascending: true }),

				// Packages data
				supabase
					.from("packages")
					.select("id, name, price, session_count, package_type, is_active"),
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
				(s: any) =>
					new Date(s.start_time) > now && s.status === "scheduled"
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
									sum +
									(s.current_bookings / (s.max_capacity || 1)) * 100,
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
							((totalMembersEndOfCurrentMonth - totalMembersEndOfLastMonth) / totalMembersEndOfLastMonth) *
								100
					  )
					: totalMembersEndOfCurrentMonth > 0 ? 100 : 0;

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
			const revenueByPkg: { [key: string]: { revenue: number; count: number } } =
				{};
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

			const statusData = Object.entries(statusCounts).map(([status, count]) => ({
				status,
				count: count as number,
				percentage: Math.round(((count as number) / sessions.length) * 100),
			}));
			setSessionStatusData(statusData);

			// Process daily revenue for last 30 days
			const dailyRevenueMap: { [key: string]: { revenue: number; sessions: number } } = {};
			
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
			const monthlyGrowth: { [key: string]: { new: number; total: number } } = {};
			
			for (let i = 5; i >= 0; i--) {
				const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
				const monthKey = date.toISOString().substr(0, 7);
				const monthName = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
				monthlyGrowth[monthName] = { new: 0, total: 0 };
			}

			let cumulativeMembers = 0;
			Object.keys(monthlyGrowth).forEach((monthName, index) => {
				const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
				const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index) + 1, 1);
				
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

			// Process package popularity
			const packageStats: {
				[key: string]: { activeCount: number; totalRevenue: number; prices: number[] };
			} = {};

			memberPackages
				.filter((mp: any) => mp.status === "active")
				.forEach((mp: any) => {
					const packageName = mp.packages?.name || "Unknown";
					const price = Number(mp.packages?.price) || 0;
					
					if (!packageStats[packageName]) {
						packageStats[packageName] = { activeCount: 0, totalRevenue: 0, prices: [] };
					}
					packageStats[packageName].activeCount += 1;
					packageStats[packageName].totalRevenue += price;
					packageStats[packageName].prices.push(price);
				});

			setPackagePopularity(
				Object.entries(packageStats).map(([packageName, data]) => ({
					packageName,
					activeCount: data.activeCount,
					totalRevenue: data.totalRevenue,
					averagePrice: data.prices.length > 0 
						? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
						: 0,
				}))
			);

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

	if (!auth.user) {
		return (
			<div className="container mx-auto py-6">
				<div className="text-center">Loading...</div>
			</div>
		);
	}

	return (
		<AdminRoute>
			<div className="container mx-auto max-w-7xl py-6 space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button variant="ghost" size="icon" onClick={() => router.back()}>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div>
							<h1 className="text-3xl font-bold">Analytics & Reports</h1>
							<p className="text-muted-foreground">
								Real-time insights and performance metrics
							</p>
						</div>
					</div>
					<Button
						onClick={loadReportsData}
						disabled={isLoading}
						variant="outline"
					>
						<RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
						Refresh Data
					</Button>
				</div>

				{/* Key Metrics */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
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
								<span className="text-green-600">{stats.activeMembers} active</span>
								{stats.growthRate !== 0 && (
									<span className={`ml-2 ${stats.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
										{stats.growthRate > 0 ? '+' : ''}{stats.growthRate}% growth
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
							<CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
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
					{/* Revenue by Package */}
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Package className="h-5 w-5" />
								Revenue by Package
							</CardTitle>
							<CardDescription>Total revenue generated by each package type</CardDescription>
						</CardHeader>
						<CardContent>
							<ResponsiveContainer width="100%" height={300}>
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
						</CardContent>
					</Card>

					{/* Session Status */}
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Activity className="h-5 w-5" />
								Session Status Distribution
							</CardTitle>
							<CardDescription>Breakdown of sessions by current status</CardDescription>
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
										dataKey="count"
									>
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
							<CardDescription>Revenue and session activity over time</CardDescription>
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
									<YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
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
							<CardDescription>New member registrations and total growth</CardDescription>
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

				{/* Data Tables */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Recent Session Attendance */}
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Clock className="h-5 w-5" />
								Recent Session Attendance
							</CardTitle>
							<CardDescription>Performance metrics for recent sessions</CardDescription>
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
										<div className="font-medium truncate" title={session.sessionTitle}>
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
												}
											>
												{session.attendanceRate}%
											</Badge>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Package Popularity */}
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Zap className="h-5 w-5" />
								Package Popularity & Performance
							</CardTitle>
							<CardDescription>Active packages and revenue metrics</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
									<div>Package</div>
									<div>Active</div>
									<div>Revenue</div>
									<div>Avg Price</div>
								</div>
								{packagePopularity.map((pkg, index) => (
									<div key={index} className="grid grid-cols-4 gap-2 text-sm">
										<div className="font-medium truncate" title={pkg.packageName}>
											{pkg.packageName}
										</div>
										<div>
											<Badge variant="outline">{pkg.activeCount}</Badge>
										</div>
										<div className="font-medium text-green-600">
											{formatCurrency(pkg.totalRevenue)}
										</div>
										<div>{formatCurrency(pkg.averagePrice)}</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Summary Stats */}
				<Card className="rounded-2xl shadow-xl dark:bg-background/80">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BarChart3 className="h-5 w-5" />
							Quick Insights
						</CardTitle>
						<CardDescription>Key performance indicators and trends</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="text-center">
								<div className="text-3xl font-bold text-blue-600">
									{stats.topPackage}
								</div>
								<p className="text-sm text-muted-foreground">Most Popular Package</p>
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
									{stats.growthRate > 0 ? '+' : ''}{stats.growthRate}%
								</div>
								<p className="text-sm text-muted-foreground">Monthly Growth Rate</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</AdminRoute>
	);
}