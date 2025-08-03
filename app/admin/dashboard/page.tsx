"use client";

import type React from "react";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserDropdown } from "@/components/ui/user-dropdown";
import { AdminRoute } from "@/components/ProtectedRoute";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Users,
	Calendar,
	TrendingUp,
	Activity,
	UserPlus,
	CalendarPlus,
	Settings,
	BarChart3,
	Package,
	Clock,
	AlertCircle,
	BookOpen,
	Home,
	Bell,
	Eye,
	ExternalLink,
	ArrowRight,
	XCircle,
	AlertTriangle,
	Mail,
	Edit,
	ArrowLeft,
	ChevronDown,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { activityLogger } from "@/lib/activity-logger";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
	totalMembers: number;
	activeMembers: number;
	totalSessions: number;
	upcomingSessions: number;
	completedSessions: number;
	totalRevenue: number;
	monthlyRevenue: number;
}

interface RecentActivity {
	id: string;
	type: string;
	message: string;
	details?: string | object;
	timestamp: string;
	category?: string;
	memberId?: string;
	memberName?: string;
	sessionId?: string;
	sessionTitle?: string;
	packageId?: string;
	packageType?: string;
	notificationId?: string;
	priority?: "low" | "medium" | "high";
	status?: "success" | "warning" | "error" | "info";
}

interface UpcomingSession {
	id: string;
	title: string;
	date: string;
	time: string;
	trainer: string;
	type?: string; // Now optional, or you can remove this line if not used elsewhere
	capacity: { booked: number; total: number };
	status: string;
}

interface PackageRequest {
	id: string;
	member_id: string;
	package_id: string;
	status: string;
	requested_at: string;
	notes?: string;
	members?: {
		profiles?: {
			full_name?: string;
			email?: string;
		};
	};
	packages?: {
		name: string;
		price: number;
		session_count: number;
	};
}

interface ActivityGroup {
	type: string;
	title: string;
	description: string;
	activities: RecentActivity[];
	viewAllPath: string;
	icon: React.ReactNode;
	color: string;
}

export default function AdminDashboard() {
	const router = useRouter();
	const { toast } = useToast();
	const [stats, setStats] = useState<DashboardStats>({
		totalMembers: 0,
		activeMembers: 0,
		totalSessions: 0,
		upcomingSessions: 0,
		completedSessions: 0,
		totalRevenue: 0,
		monthlyRevenue: 0,
	});

	const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
		[]
	);
	const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>(
		[]
	);
	const [packageRequests, setPackageRequests] = useState<PackageRequest[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedActivity, setSelectedActivity] =
		useState<RecentActivity | null>(null);
	const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
	const [attendanceRate, setAttendanceRate] = useState(0);
	const [pendingPackageRequests, setPendingPackageRequests] = useState(0);
	const [equipmentNeedingMaintenance, setEquipmentNeedingMaintenance] =
		useState(0);
	const [isPackageRequestsOpen, setIsPackageRequestsOpen] = useState(false);
	const [isRecentActivityOpen, setIsRecentActivityOpen] = useState(true);
	const [activityGroupStates, setActivityGroupStates] = useState<{[key: string]: boolean}>({});

	useEffect(() => {
		loadDashboardData();
	}, []);

	const loadDashboardData = async () => {
		try {
			setLoading(true);
			const supabase = createClient();

			// Get current date for calculations
			const now = new Date();
			const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			const endOfMonth = new Date(
				now.getFullYear(),
				now.getMonth() + 1,
				0,
				23,
				59,
				59,
				999
			);

			// 1. Monthly Revenue: Sum of legit completed payments in current month
			const { data: legitMonthlyPayments, error: legitMonthlyPaymentsError } =
				await supabase
					.from("payments")
					.select(
						"amount, status, payment_date, transaction_id, invoice_number"
					)
					.eq("status", "completed")
					.neq("transaction_id", null)
					.neq("invoice_number", null)
					.gte("payment_date", startOfMonth.toISOString())
					.lte("payment_date", endOfMonth.toISOString());

			const monthlyRevenue = (legitMonthlyPayments || []).reduce(
				(sum, payment) => sum + (Number(payment.amount) || 0),
				0
			);

			// 2. Attendance Rate: Calculate from sessions table for current month
			const { data: monthSessionsRaw, error: monthSessionsError } =
				await supabase
					.from("sessions")
					.select("id, start_time, status, max_capacity, current_bookings")
					.gte("start_time", startOfMonth.toISOString())
					.lte("start_time", endOfMonth.toISOString());
			const monthSessions = monthSessionsRaw || [];

			const totalSessions = monthSessions.length;
			let attendanceRate = 0;
			if (totalSessions > 0) {
				const totalCapacity = monthSessions.reduce(
					(sum, s) => sum + (s.max_capacity || 0),
					0
				);
				const totalAttended = monthSessions.reduce(
					(sum, s) => sum + (s.current_bookings || 0),
					0
				);
				attendanceRate =
					totalCapacity > 0
						? Math.round((totalAttended / totalCapacity) * 100)
						: 0;
				setAttendanceRate(attendanceRate);
			}

			// Load comprehensive data from Supabase with error handling
			const [
				membersResult,
				sessionsResult,
				upcomingSessionsResult,
				paymentsResult,
				notificationsResult,
				recentBookingsResult,
				recentMembersResult,
				trainersResult,
				packageRequestsResult,
				equipmentResult,
				memberPackagesResult,
				attendanceResult,
			] = await Promise.allSettled([
				// Members data
				supabase.from("members").select("id, membership_status, joined_at"),

				// All sessions
				supabase
					.from("sessions")
					.select(
						"id, title, start_time, end_time, status, current_bookings, max_capacity"
					)
					.order("start_time", { ascending: true }),

				// Upcoming sessions with trainer details (with fallback for missing trainers table)
				supabase
					.from("sessions")
					.select(
						`
            id, title, start_time, end_time, status, current_bookings, max_capacity,
            trainer_id
          `
					)
					.gte("start_time", now.toISOString())
					.eq("status", "scheduled")
					.order("start_time", { ascending: true })
					.limit(5),

				// Total payments (handle missing table gracefully)
				supabase
					.from("payments")
					.select("amount, status, payment_date")
					.eq("status", "completed")
					.then(
						(result) => result,
						() => ({ data: [], error: null })
					),

				// Unread notifications count (handle missing table gracefully)
				supabase
					.from("notifications")
					.select("id")
					.eq("is_read", false)
					.then(
						(result) => result,
						() => ({ data: [], error: null })
					),

				// Recent bookings for detailed activity
				supabase
					.from("bookings")
					.select(
						`
            id, booking_time, status, notes,
            member_id, session_id
          `
					)
					.order("booking_time", { ascending: false })
					.limit(5),

				// Recent members
				supabase
					.from("members")
					.select(
						`
            id, joined_at, membership_status,
            user_id
          `
					)
					.order("joined_at", { ascending: false })
					.limit(5),

				// Trainers (handle missing table gracefully)
				supabase
					.from("trainers")
					.select(
						`
            id, user_id
          `
					)
					.then(
						(result) => result,
						() => ({ data: [], error: null })
					),

				// Package requests (handle missing table gracefully)
				supabase
					.from("package_requests")
					.select(
						`
						id,
						member_id,
						package_id,
						status,
						requested_at,
						notes,
						members (
							profiles (
								full_name,
								email
							)
						),
						packages (
							name,
							price,
							session_count
						)
					`
					)
					.order("requested_at", { ascending: false })
					.limit(10)
					.then(
						(result) => result,
						() => ({ data: [], error: null })
					),

				// Equipment status (handle missing table gracefully)
				supabase
					.from("equipment")
					.select("id, name, status, last_maintenance_date")
					.order("last_maintenance_date", { ascending: true })
					.then(
						(result) => result,
						() => ({ data: [], error: null })
					),

				// Member packages for analytics
				supabase.from("member_packages").select(`
            id, status, start_date, end_date, sessions_remaining, sessions_total,
            package_id, member_id
          `),

				// Attendance data for this month (handle missing table gracefully)
				supabase
					.from("attendance_summary")
					.select(
						"total_booked, total_attended, total_no_shows, attendance_rate"
					)
					.eq("month", now.getMonth() + 1)
					.eq("year", now.getFullYear())
					.then(
						(result) => result,
						() => ({ data: [], error: null })
					),
			]);

			// Process data with Promise.allSettled results
			const members =
				(membersResult.status === "fulfilled"
					? membersResult.value.data
					: []) || [];
			const sessions =
				(sessionsResult.status === "fulfilled"
					? sessionsResult.value.data
					: []) || [];
			const upcomingSessionsData =
				(upcomingSessionsResult.status === "fulfilled"
					? upcomingSessionsResult.value.data
					: []) || [];
			const payments =
				(paymentsResult.status === "fulfilled"
					? paymentsResult.value.data
					: []) || [];
			const notifications =
				(notificationsResult.status === "fulfilled"
					? notificationsResult.value.data
					: []) || [];
			const recentBookings =
				(recentBookingsResult.status === "fulfilled"
					? recentBookingsResult.value.data
					: []) || [];
			const recentMembers =
				(recentMembersResult.status === "fulfilled"
					? recentMembersResult.value.data
					: []) || [];
			const packageRequests =
				(packageRequestsResult.status === "fulfilled"
					? packageRequestsResult.value.data
					: []) || [];

			// Transform package requests data
			const transformedPackageRequests = packageRequests.map(
				(request: any) => ({
					id: request.id,
					member_id: request.member_id,
					package_id: request.package_id,
					status: request.status,
					requested_at: request.requested_at,
					notes: request.notes,
					members: Array.isArray(request.members)
						? request.members[0]
						: request.members,
					packages: Array.isArray(request.packages)
						? request.packages[0]
						: request.packages,
				})
			);

			setPackageRequests(transformedPackageRequests);
			const equipment =
				(equipmentResult.status === "fulfilled"
					? equipmentResult.value.data
					: []) || [];
			const memberPackages =
				(memberPackagesResult.status === "fulfilled"
					? memberPackagesResult.value.data
					: []) || [];
			const attendanceData =
				(attendanceResult.status === "fulfilled"
					? attendanceResult.value.data
					: []) || [];

			// Calculate stats
			const activeMembers = members.filter(
				(m) => m.membership_status === "active"
			);
			const todaySessions = sessions.filter((s) => {
				const sessionDate = new Date(s.start_time);
				return (
					sessionDate >= startOfMonth &&
					sessionDate < new Date(startOfMonth.getTime() + 24 * 60 * 60 * 1000)
				);
			});
			const completedSessions = sessions.filter((s) => {
				return new Date(s.start_time) < now && s.status !== "cancelled";
			});

			const totalRevenue = payments.reduce(
				(sum, payment) => sum + (Number(payment.amount) || 0),
				0
			);
			// const monthlyRevenue = monthlyPayments.reduce(
			// 	(sum, payment) => sum + (Number(payment.amount) || 0),
			// 	0
			// );

			// Calculate additional metrics
			const pendingPackageRequestsCount = packageRequests.filter(
				(req) => req.status === "pending"
			).length;
			const equipmentNeedingMaintenanceCount = equipment.filter((eq) => {
				if (!eq.last_maintenance_date) return true;
				const lastMaintenance = new Date(eq.last_maintenance_date);
				const daysSince =
					(now.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24);
				return daysSince > 30; // Need maintenance if over 30 days
			}).length;

			setPendingPackageRequests(pendingPackageRequestsCount);
			setEquipmentNeedingMaintenance(equipmentNeedingMaintenanceCount);

			// Calculate package analytics
			const activePackages = memberPackages.filter(
				(mp) => mp.status === "active"
			);
			const expiringPackages = activePackages.filter((mp) => {
				const endDate = new Date(mp.end_date);
				const daysUntilExpiry =
					(endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
				return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
			}).length;

			// Calculate attendance metrics
			const totalAttendanceData = attendanceData.reduce(
				(acc, curr) => ({
					total_booked: acc.total_booked + (curr.total_booked || 0),
					total_attended: acc.total_attended + (curr.total_attended || 0),
					total_no_shows: acc.total_no_shows + (curr.total_no_shows || 0),
				}),
				{ total_booked: 0, total_attended: 0, total_no_shows: 0 }
			);

			// Generate real recent activities from database data
			const realActivities: RecentActivity[] = [];

			// Add recent member registrations
			recentMembers.forEach((member) => {
				realActivities.push({
					id: `member-${member.id}`,
					type: "member_created",
					category: "members",
					message: `New member registered`,
					details: `Membership status: ${
						member.membership_status
					}, Joined: ${new Date(member.joined_at).toLocaleDateString()}`,
					timestamp: member.joined_at,
					memberId: member.id,
					memberName: "Member",
					status: "success",
					priority: "medium",
				});
			});

			// Add recent bookings
			recentBookings.forEach((booking) => {
				realActivities.push({
					id: `booking-${booking.id}`,
					type: "session_booked",
					category: "sessions",
					message: `Session booked`,
					details: `Booking status: ${booking.status}, Booked: ${new Date(
						booking.booking_time
					).toLocaleDateString()}`,
					timestamp: booking.booking_time,
					memberId: booking.member_id,
					memberName: "Member",
					sessionId: booking.session_id,
					sessionTitle: "Session",
					status: "success",
					priority: "low",
				});
			});

			// Add package requests (if any exist)
			packageRequests.forEach((request) => {
				realActivities.push({
					id: `package-request-${request.id}`,
					type: "package_request_received",
					category: "notifications",
					message: `Package request received`,
					details: `Status: ${request.status || "pending"}`,
					timestamp: request.requested_at || new Date().toISOString(),
					status: "warning",
					priority: "medium",
				});
			});

			// Add equipment maintenance alerts
			equipment.forEach((eq) => {
				if (eq.status === "needs_maintenance" || !eq.last_maintenance_date) {
					const daysSince = eq.last_maintenance_date
						? Math.floor(
								(now.getTime() - new Date(eq.last_maintenance_date).getTime()) /
									(1000 * 60 * 60 * 24)
						  )
						: 999;

					realActivities.push({
						id: `equipment-${eq.id}`,
						type: "equipment_maintenance_due",
						category: "notifications",
						message: `Equipment ${eq.name} needs maintenance`,
						details: `Status: ${eq.status}, Last maintenance: ${
							eq.last_maintenance_date ? `${daysSince} days ago` : "Never"
						}`,
						timestamp:
							eq.last_maintenance_date ||
							new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
						status: "warning",
						priority: daysSince > 60 ? "high" : "medium",
					});
				}
			});

			// Fix package expiry warning activity (remove mp.packages usage, second pass)
			memberPackages.forEach((mp) => {
				if (mp.status === "active" && mp.end_date) {
					const endDate = new Date(mp.end_date);
					const daysUntilExpiry =
						(endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

					if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
						realActivities.push({
							id: `package-expiry-${mp.id}`,
							type: "package_expiry_warning",
							category: "packages",
							message: `Package expiring soon`,
							details: `Expires in ${Math.ceil(daysUntilExpiry)} days, ${
								mp.sessions_remaining || 0
							} sessions remaining`,
							timestamp: new Date().toISOString(),
							packageType: "Unknown",
							status: "warning",
							priority: daysUntilExpiry <= 3 ? "high" : "medium",
						});
					}
				}
			});

			// Sort activities by timestamp
			realActivities.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			);

			// If no real activities, generate sample activities
			if (realActivities.length === 0) {
				const sampleActivities = generateSampleActivities();
				setRecentActivities(sampleActivities);
			} else {
				setRecentActivities(realActivities.slice(0, 20));
			}

			// Format upcoming sessions
			const formattedUpcomingSessions: UpcomingSession[] =
				upcomingSessionsData.map(
					(session) => (
						console.log("when formating"),
						console.log(session),
						{
							id: session.id,
							title: session.title,
							date: new Date(session.start_time).toISOString().split("T")[0],
							time: `${formatTime12Hour(
								session.start_time
							)} - ${formatTime12Hour(session.end_time)}`,
							// Remove type: session.session_type, since session_type no longer exists
							// Optionally, you can add a placeholder or remove the type field from UpcomingSession
							type: "-",
							trainer: "Assigned Trainer", // Fallback since trainer details might not be available
							status:
								session.current_bookings >= session.max_capacity
									? "Full"
									: "Available",
							capacity: {
								booked: session.current_bookings || 0,
								total: session.max_capacity || 1,
							},
						}
					)
				);

			// Calculate dashboard stats
			const dashboardStats: DashboardStats = {
				totalMembers: members.length,
				activeMembers: activeMembers.length,
				totalSessions: sessions.length,
				upcomingSessions: upcomingSessionsData.length,
				completedSessions: completedSessions.length,
				totalRevenue: totalRevenue,
				monthlyRevenue: monthlyRevenue,
			};

			setStats(dashboardStats);
			setUpcomingSessions(formattedUpcomingSessions.slice(0, 5));

			// Load real activities from the database
			try {
				const activities = await activityLogger.getRecentActivity(50);
				const transformedActivities: RecentActivity[] = activities.map(
					(activity) => ({
						id: activity.id || "unknown",
						type: activity.action,
						category: activity.target_type,
						message: activityLogger.formatActivityMessage(activity),
						details: activity.details
							? JSON.stringify(activity.details)
							: undefined,
						timestamp: activity.created_at || new Date().toISOString(),
						status: "success",
						priority: activity.action.includes("create") ? "medium" : "low",
					})
				);

				setRecentActivities(transformedActivities);
			} catch (activityError) {
				console.error("Error loading activities:", activityError);
				// Fallback to sample data on error
				const sampleActivities = generateSampleActivities();
				setRecentActivities(sampleActivities);
			}
		} catch (error) {
			console.error("Error loading dashboard data:", error);
			// Fallback to sample data on error
			const sampleActivities = generateSampleActivities();
			setRecentActivities(sampleActivities);
		} finally {
			setLoading(false);
		}
	};

	const generateSampleActivities = (): RecentActivity[] => {
		const now = new Date();
		return [
			{
				id: "act-1",
				type: "member_created",
				category: "members",
				message: "New member John Doe registered",
				details: "Personal Training package selected, payment completed",
				timestamp: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
				memberId: "1",
				memberName: "John Doe",
				status: "success",
				priority: "medium",
			},
			{
				id: "act-2",
				type: "session_booked",
				category: "sessions",
				message: "Jane Smith booked Morning Yoga session",
				details: "Session scheduled for tomorrow at 9:00 AM with Emma Thompson",
				timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
				memberId: "2",
				memberName: "Jane Smith",
				sessionId: "s3",
				sessionTitle: "Morning Yoga",
				status: "success",
				priority: "low",
			},
			{
				id: "act-3",
				type: "package_assigned",
				category: "packages",
				message: "Emily Williams purchased Personal Training package",
				details: "10-session package, expires in 3 months, payment completed",
				timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
				memberId: "4",
				memberName: "Emily Williams",
				packageType: "Personal Training",
				status: "success",
				priority: "medium",
			},
			{
				id: "act-4",
				type: "session_status_updated",
				category: "sessions",
				message: "HIIT Training session marked as Full",
				details: "All 10 spots filled, waitlist activated",
				timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString(),
				sessionId: "s2",
				sessionTitle: "HIIT Training",
				status: "warning",
				priority: "medium",
			},
			{
				id: "act-5",
				type: "package_expiry_warning",
				category: "packages",
				message: "Robert Brown's Group Class package expires soon",
				details: "Package expires in 3 days, 2 sessions remaining",
				timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 8).toISOString(),
				memberId: "5",
				memberName: "Robert Brown",
				packageType: "Group Class",
				status: "warning",
				priority: "high",
			},
			{
				id: "act-6",
				type: "session_cancelled",
				category: "sessions",
				message: "Evening Pilates session cancelled",
				details: "Cancelled due to trainer unavailability, 5 members notified",
				timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
				sessionTitle: "Evening Pilates",
				status: "error",
				priority: "high",
			},
			{
				id: "act-7",
				type: "notification_sent",
				category: "notifications",
				message: "Package renewal reminder sent to 3 members",
				details: "Automated reminders for packages expiring within 7 days",
				timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 18).toISOString(),
				status: "info",
				priority: "low",
			},
			{
				id: "act-8",
				type: "session_modified",
				category: "sessions",
				message: "Yoga class time changed",
				details:
					"Morning Yoga moved from 8:00 AM to 9:00 AM, participants notified",
				timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
				sessionId: "s3",
				sessionTitle: "Morning Yoga",
				status: "info",
				priority: "medium",
			},
			{
				id: "act-9",
				type: "package_request_received",
				category: "notifications",
				message: "Package upgrade request from Michael Johnson",
				details: "Requesting upgrade from Group Class to Personal Training",
				timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 36).toISOString(),
				memberId: "3",
				memberName: "Michael Johnson",
				status: "info",
				priority: "medium",
			},
			{
				id: "act-10",
				type: "package_created",
				category: "packages",
				message: "New package type 'Physio Sessions' created",
				details: "8-session package for physiotherapy, $320 price point",
				timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
				packageType: "Physio Sessions",
				status: "success",
				priority: "low",
			},
		];
	};

	const getActivityIcon = (type: string) => {
		switch (type) {
			case "member_created":
				return <UserPlus className="h-4 w-4" />;
			case "member_updated":
				return <Edit className="h-4 w-4" />;
			case "session_created":
				return <CalendarPlus className="h-4 w-4" />;
			case "session_booked":
				return <BookOpen className="h-4 w-4" />;
			case "session_status_updated":
				return <AlertTriangle className="h-4 w-4" />;
			case "session_cancelled":
				return <XCircle className="h-4 w-4" />;
			case "session_modified":
				return <Edit className="h-4 w-4" />;
			case "package_assigned":
			case "package_created":
				return <Package className="h-4 w-4" />;
			case "package_expiry_warning":
				return <AlertCircle className="h-4 w-4" />;
			case "notification_sent":
			case "package_request_received":
				return <Mail className="h-4 w-4" />;
			case "equipment_maintenance_due":
				return <Settings className="h-4 w-4" />;
			default:
				return <Activity className="h-4 w-4" />;
		}
	};

	const getActivityColor = (status?: string) => {
		switch (status) {
			case "success":
				return "text-green-600";
			case "warning":
				return "text-yellow-600";
			case "error":
				return "text-red-600";
			case "info":
				return "text-blue-600";
			default:
				return "text-gray-600";
		}
	};

	const getStatusBadge = (status?: string) => {
		switch (status) {
			case "success":
				return <Badge className="bg-green-100 text-green-800">Success</Badge>;
			case "warning":
				return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
			case "error":
				return <Badge className="bg-red-100 text-red-800">Error</Badge>;
			case "info":
				return <Badge className="bg-blue-100 text-blue-800">Info</Badge>;
			default:
				return null;
		}
	};

	const getPriorityBadge = (priority?: string) => {
		switch (priority) {
			case "high":
				return (
					<Badge variant="destructive" className="text-xs">
						High
					</Badge>
				);
			case "medium":
				return (
					<Badge variant="secondary" className="text-xs">
						Medium
					</Badge>
				);
			case "low":
				return (
					<Badge variant="outline" className="text-xs">
						Low
					</Badge>
				);
			default:
				return null;
		}
	};

	const groupActivitiesByType = (
		activities: RecentActivity[]
	): ActivityGroup[] => {
		const groups: { [key: string]: ActivityGroup } = {
			members: {
				type: "members",
				title: "Member Activities",
				description: "New registrations, updates, and member-related actions",
				activities: [],
				viewAllPath: "/admin/members",
				icon: <Users className="h-5 w-5" />,
				color: "text-blue-600",
			},
			sessions: {
				type: "sessions",
				title: "Session Management",
				description: "Bookings, cancellations, and session updates",
				activities: [],
				viewAllPath: "/admin/sessions",
				icon: <Calendar className="h-5 w-5" />,
				color: "text-green-600",
			},
			packages: {
				type: "packages",
				title: "Package Management",
				description: "Package assignments, creations, and expiry notifications",
				activities: [],
				viewAllPath: "/admin/packages",
				icon: <Package className="h-5 w-5" />,
				color: "text-purple-600",
			},
			notifications: {
				type: "notifications",
				title: "Communications",
				description: "Notifications sent and received, member requests",
				activities: [],
				viewAllPath: "/admin/notifications",
				icon: <Bell className="h-5 w-5" />,
				color: "text-orange-600",
			},
		};

		activities.forEach((activity) => {
			// Map entity types to group categories
			const entityTypeToCategory: { [key: string]: string } = {
				member: "members",
				session: "sessions",
				package: "packages",
				trainer: "members", // Trainer activities go under members for now
				booking: "sessions",
				payment: "packages",
			};

			let category: string = "general";
			if (activity.category && typeof activity.category === "string") {
				category = entityTypeToCategory[activity.category] || activity.category;
			}
			if (groups[category]) {
				groups[category].activities.push(activity);
			}
		});

		return Object.values(groups).filter((group) => group.activities.length > 0);
	};

	const handleActivityClick = (activity: RecentActivity) => {
		setSelectedActivity(activity);
		setIsActivityDialogOpen(true);
	};

	const handleViewAll = (path: string) => {
		router.push(path);
	};

	const toggleActivityGroup = (groupType: string) => {
		setActivityGroupStates(prev => ({
			...prev,
			[groupType]: !prev[groupType]
		}));
	};

	const formatActivityDetails = (activity: RecentActivity) => {
		if (typeof activity.details === "string") {
			return activity.details;
		}

		if (typeof activity.details === "object" && activity.details !== null) {
			return JSON.stringify(activity.details, null, 2);
		}

		// Fallback to constructing details from other properties
		const details = [];
		if (activity.memberName) details.push(`Member: ${activity.memberName}`);
		if (activity.memberId) details.push(`Member ID: ${activity.memberId}`);
		if (activity.sessionTitle)
			details.push(`Session: ${activity.sessionTitle}`);
		if (activity.packageType) details.push(`Package: ${activity.packageType}`);

		return details.length > 0
			? details.join("\n")
			: "No additional details available";
	};

	const activityGroups = groupActivitiesByType(recentActivities);

	const auth = useAuth();

	const handleApproveRequest = async (requestId: string) => {
		try {
			const supabase = createClient();
			const request = packageRequests.find((r) => r.id === requestId);
			if (!request) return;

			// Update request status
			const { error: updateError } = await supabase
				.from("package_requests")
				.update({
					status: "approved",
					approved_by: auth.user?.id,
					approved_at: new Date().toISOString(),
				})
				.eq("id", requestId);

			if (updateError) throw updateError;

			// Create member package
			const { error: packageError } = await supabase
				.from("member_packages")
				.insert({
					member_id: request.member_id,
					package_id: request.package_id,
					start_date: new Date().toISOString().split("T")[0],
					end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
						.toISOString()
						.split("T")[0], // 1 year from now
					sessions_remaining: request.packages?.session_count || 0,
					sessions_total: request.packages?.session_count || 0,
					status: "active",
					activated_at: new Date().toISOString(),
				});

			if (packageError) throw packageError;

			// Create notification for member
			await supabase.from("notifications").insert({
				user_id: request.member_id, // Use member_id directly
				title: "Package Request Approved",
				message: `Your request for ${request.packages?.name} package has been approved!`,
				type: "alert",
				is_read: false,
				created_at: new Date().toISOString(),
			});

			// Log activity
			await activityLogger.logActivity(
				"member_updated", // Use valid action type
				"member", // Use valid target type
				request.member_id, // Use member_id as target_id
				{
					memberName: request.members?.profiles?.full_name,
					packageName: request.packages?.name,
					packagePrice: request.packages?.price,
				}
			);

			// Update local state
			setPackageRequests((prev) => prev.filter((r) => r.id !== requestId));

			toast({
				title: "Request Approved",
				description:
					"Package request has been approved and member package created.",
			});
		} catch (error) {
			console.error("Error approving request:", error);
			toast({
				title: "Error",
				description: "Failed to approve package request.",
				variant: "destructive",
			});
		}
	};

	const handleRejectRequest = async (requestId: string) => {
		try {
			const supabase = createClient();
			const request = packageRequests.find((r) => r.id === requestId);
			if (!request) return;

			// Update request status
			const { error: updateError } = await supabase
				.from("package_requests")
				.update({
					status: "rejected",
					approved_by: auth.user?.id,
					approved_at: new Date().toISOString(),
				})
				.eq("id", requestId);

			if (updateError) throw updateError;

			// Create notification for member
			await supabase.from("notifications").insert({
				user_id: request.member_id, // Use member_id directly
				title: "Package Request Rejected",
				message: `Your request for ${request.packages?.name} package has been rejected. Please contact admin for more information.`,
				type: "alert",
				is_read: false,
				created_at: new Date().toISOString(),
			});

			// Log activity
			await activityLogger.logActivity(
				"member_updated", // Use valid action type
				"member", // Use valid target type
				request.member_id, // Use member_id as target_id
				{
					memberName: request.members?.profiles?.full_name,
					packageName: request.packages?.name,
				}
			);

			// Update local state
			setPackageRequests((prev) => prev.filter((r) => r.id !== requestId));

			toast({
				title: "Request Rejected",
				description: "Package request has been rejected.",
			});
		} catch (error) {
			console.error("Error rejecting request:", error);
			toast({
				title: "Error",
				description: "Failed to reject package request.",
				variant: "destructive",
			});
		}
	};

	// Helper to format time as 12-hour (AM/PM) from UTC DB string
	function formatTime12Hour(dateString: string): string {
		const date = new Date(dateString);
		let hours = date.getUTCHours();
		const minutes = date.getUTCMinutes();
		const ampm = hours >= 12 ? "pm" : "am";
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		const pad = (n: number) => n.toString().padStart(2, "0");
		return `${pad(hours)}:${pad(minutes)} ${ampm}`;
	}

	return (
		<AdminRoute>
			<div className="container mx-auto max-w-7xl py-6 space-y-6">
				{/* Header */}
				<div className="relative mb-8">
					<div className="absolute inset-0 h-32 bg-gradient-to-br from-blue-900/60 to-gray-900/80 rounded-2xl blur-lg -z-10" />
					<div className="flex items-center justify-between gap-6 p-6 rounded-2xl shadow-xl bg-background/80 dark:bg-background/60 backdrop-blur border border-border">
						<div className="flex items-center gap-6">
							<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold border-4 border-primary shadow-lg">
								<Activity className="w-10 h-10 text-primary" />
							</div>
							<div>
								<div className="font-bold text-2xl flex items-center gap-2">
									Admin Dashboard
								</div>
								<div className="text-muted-foreground text-sm">
									Welcome back! Here's what's happening at your gym.
								</div>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<Button variant="outline" size="icon" asChild>
								<Link href="/admin/notifications">
									<Bell className="h-5 w-5" />
									<span className="sr-only">Notifications</span>
								</Link>
							</Button>
							<Button variant="outline" size="icon" asChild>
								<Link href="/admin/calendar">
									<Calendar className="h-5 w-5" />
									<span className="sr-only">Calendar View</span>
								</Link>
							</Button>
							<UserDropdown />
						</div>
					</div>
				</div>

		
				{/* Quick Actions */}
				<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Settings className="h-5 w-5" />
							Quick Actions
						</CardTitle>
						<CardDescription>Common administrative tasks</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<Button asChild className="h-auto p-4 flex-col gap-2">
								<Link href="/admin/book-session">
									<BookOpen className="h-6 w-6" />
									<span className="text-sm">Book Session</span>
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								className="h-auto p-4 flex-col gap-2 bg-transparent">
								<Link href="/admin/members">
									<Users className="h-6 w-6" />
									<span className="text-sm">Manage Members</span>
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								className="h-auto p-4 flex-col gap-2 bg-transparent">
								<Link href="/admin/sessions">
									<CalendarPlus className="h-6 w-6" />
									<span className="text-sm">Manage Sessions</span>
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								className="h-auto p-4 flex-col gap-2 bg-transparent">
								<Link href="/admin/packages">
									<Package className="h-6 w-6" />
									<span className="text-sm">Manage Packages</span>
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								className="h-auto p-4 flex-col gap-2 bg-transparent">
								<Link href="/admin/trainers">
									<Users className="h-6 w-6" />
									<span className="text-sm">Manage Trainers</span>
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								className="h-auto p-4 flex-col gap-2 bg-transparent">
								<Link href="/admin/home-config">
									<Home className="h-6 w-6" />
									<span className="text-sm">Website Settings</span>
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								className="h-auto p-4 flex-col gap-2 bg-transparent">
								<Link href="/admin/reports">
									<BarChart3 className="h-6 w-6" />
									<span className="text-sm">View Reports</span>
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								className="h-auto p-4 flex-col gap-2 bg-transparent">
								<Link href="/admin/activity">
									<Activity className="h-6 w-6" />
									<span className="text-sm">Activity Logs</span>
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total Members
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.totalMembers}</div>
							<p className="text-xs text-muted-foreground">
								<span className="text-green-600">
									{stats.activeMembers} active
								</span>
							</p>
						</CardContent>
					</Card>

					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Upcoming Sessions
							</CardTitle>
							<Calendar className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.upcomingSessions}</div>
							<p className="text-xs text-muted-foreground">
								<span className="text-blue-600">
									{stats.completedSessions} completed
								</span>
							</p>
						</CardContent>
					</Card>

					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Monthly Revenue
							</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								${stats.monthlyRevenue.toLocaleString()}
							</div>
							<p className="text-xs text-muted-foreground">
								<span className="text-blue-600">
									{attendanceRate}% attendance rate
								</span>
							</p>
						</CardContent>
					</Card>

					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Total Revenue
							</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								${stats.totalRevenue.toLocaleString()}
							</div>
							<p className="text-xs text-muted-foreground">
								<span className="text-green-600">
									${stats.monthlyRevenue.toLocaleString()} this month
								</span>
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Package Requests - Moved to Top */}
				<Card className="rounded-2xl shadow-xl dark:bg-background/80">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Package className="h-5 w-5" />
									Package Requests
								</CardTitle>
								<CardDescription>
									{packageRequests.length} pending member requests for new packages
								</CardDescription>
							</div>
							<Button variant="outline" size="sm" asChild>
								<Link href="/admin/packages">
									View All Packages
									<ArrowRight className="h-3 w-3 ml-1" />
								</Link>
							</Button>
						</div>
					</CardHeader>
					<CardContent className="overflow-hidden">
						<ScrollArea className="h-[200px] w-full">
							{loading && (
								<div className="flex items-center justify-center h-32">
									<p className="text-muted-foreground">
										Loading package requests...
									</p>
								</div>
							)}

							{!loading && packageRequests.length === 0 && (
								<div className="text-center py-8">
									<Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<p className="text-muted-foreground">
										No pending package requests
									</p>
								</div>
							)}

							{!loading && packageRequests.length > 0 && (
								<div className="space-y-4 w-full max-w-full">
									{packageRequests.map((request) => (
										<div
											key={request.id}
											className="p-4 rounded-xl border hover:bg-muted/50 transition-colors w-full max-w-full overflow-hidden">
											<div className="flex items-start justify-between w-full max-w-full">
												<div className="flex-1 min-w-0">
													<h4 className="font-medium text-sm truncate">
														{request.packages?.name} Package Request
													</h4>
													<p className="text-xs text-muted-foreground truncate">
														Requested by:{" "}
														{request.members?.profiles?.full_name || "N/A"}
													</p>
													<p className="text-xs text-muted-foreground">
														Requested on:{" "}
														{new Date(
															request.requested_at
														).toLocaleDateString()}
													</p>
													<p className="text-xs text-muted-foreground">
														Status: {request.status}
													</p>
													{request.notes && (
														<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
															Notes: {request.notes}
														</p>
													)}
												</div>
												<div className="flex flex-col items-end gap-2 flex-shrink-0">
													{request.status === "pending" && (
														<>
															<Button
																variant="outline"
																size="sm"
																onClick={() => handleApproveRequest(request.id)}
																className="text-xs">
																Approve
															</Button>
															<Button
																variant="outline"
																size="sm"
																onClick={() => handleRejectRequest(request.id)}
																className="text-xs text-red-600">
																Reject
															</Button>
														</>
													)}
													{request.status === "approved" && (
														<Badge variant="default" className="text-xs">
															Approved
														</Badge>
													)}
													{request.status === "rejected" && (
														<Badge variant="destructive" className="text-xs">
															Rejected
														</Badge>
													)}
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</ScrollArea>
					</CardContent>
				</Card>


				{/* Recent Activity and Upcoming Sessions - Side by Side */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Recent Activity - 50% with Individual Subsection Collapsibles */}
					<div className="space-y-6 w-full">
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-bold">Recent Activity</h2>
							<Button variant="outline" asChild>
								<Link href="/admin/activity">
									<Activity className="h-4 w-4 mr-2" />
									View All Activities
								</Link>
							</Button>
						</div>

						{loading && (
							<div className="space-y-6 w-full">
								{Array.from({ length: 2 }).map((_, i) => (
									<Card
										key={i}
										className="rounded-2xl shadow-xl dark:bg-background/80 w-full">
										<CardHeader>
											<div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
											<div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
										</CardHeader>
										<CardContent>
											<div className="space-y-3">
												{Array.from({ length: 3 }).map((_, j) => (
													<div
														key={j}
														className="h-16 bg-gray-200 rounded animate-pulse"></div>
												))}
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}

						{!loading && activityGroups.length === 0 && (
							<Card className="rounded-2xl shadow-xl dark:bg-background/80 w-full">
								<CardContent className="text-center py-8">
									<Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<p className="text-muted-foreground">
										No recent activities to display
									</p>
								</CardContent>
							</Card>
						)}

						{!loading && activityGroups.length > 0 && (
							<div className="space-y-6 w-full">
								{activityGroups.slice(0, 2).map((group) => {
									const isGroupOpen = activityGroupStates[group.type] !== false; // Default to open
									return (
										<Collapsible 
											key={group.type}
											open={isGroupOpen} 
											onOpenChange={() => toggleActivityGroup(group.type)}
										>
											<Card className="rounded-2xl shadow-xl dark:bg-background/80 w-full">
												<CollapsibleTrigger asChild>
													<CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
														<div className="flex items-center justify-between w-full">
															<div className="flex items-center gap-2 min-w-0 flex-1">
																<div className={`${group.color} flex-shrink-0`}>
																	{group.icon}
																</div>
																<div className="min-w-0 flex-1">
																	<CardTitle className="text-lg truncate">
																		{group.title}
																	</CardTitle>
																	<CardDescription className="truncate">
																		{group.description}
																	</CardDescription>
																</div>
															</div>
															<div className="flex items-center gap-2 flex-shrink-0">
																<Button
																	variant="outline"
																	size="sm"
																	onClick={(e) => {
																		e.stopPropagation();
																		handleViewAll(group.viewAllPath);
																	}}
																	className="flex items-center gap-1 flex-shrink-0">
																	View All
																	<ArrowRight className="h-3 w-3" />
																</Button>
																<ChevronDown className={`h-4 w-4 transition-transform ${isGroupOpen ? 'rotate-180' : ''}`} />
															</div>
														</div>
													</CardHeader>
												</CollapsibleTrigger>
												<CollapsibleContent>
													<CardContent className="w-full overflow-hidden pt-0">
														<ScrollArea className="h-[250px] w-full">
															<div className="space-y-3 w-full max-w-full">
																{group.activities.slice(0, 5).map((activity) => (
																	<div
																		key={activity.id}
																		className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors border w-full max-w-full overflow-hidden"
																		onClick={() => handleActivityClick(activity)}>
																		<div
																			className={`mt-0.5 flex-shrink-0 ${getActivityColor(
																				activity.status
																			)}`}>
																			{getActivityIcon(activity.type)}
																		</div>
																		<div className="flex-1 min-w-0 w-full max-w-full overflow-hidden">
																			<div className="flex items-start justify-between gap-2 w-full max-w-full">
																				<p className="text-sm font-medium line-clamp-1 flex-1 min-w-0">
																					{activity.message}
																				</p>
																				<div className="flex items-center gap-1 flex-shrink-0 ml-2">
																					{getPriorityBadge(activity.priority)}
																					{getStatusBadge(activity.status)}
																				</div>
																			</div>
																			{activity.details && (
																				<p className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-full">
																					{typeof activity.details === "string"
																						? activity.details
																						: "Click to view details"}
																				</p>
																			)}
																			<div className="flex items-center justify-between mt-2 w-full max-w-full">
																				<p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
																					{new Date(
																						activity.timestamp
																					).toLocaleString()}
																				</p>
																				<Button
																					variant="ghost"
																					size="sm"
																					className="h-6 px-2 text-xs flex-shrink-0">
																					<Eye className="h-3 w-3 mr-1" />
																					Details
																				</Button>
																			</div>
																		</div>
																	</div>
																))}
															</div>
														</ScrollArea>
													</CardContent>
												</CollapsibleContent>
											</Card>
										</Collapsible>
									);
								})}
							</div>
						)}
					</div>

					{/* Upcoming Sessions - 50% */}
					<div className="space-y-6 w-full">
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-bold">Upcoming Sessions</h2>
							<Button variant="outline" asChild>
								<Link href="/admin/sessions">
									<Calendar className="h-4 w-4 mr-2" />
									View All Sessions
								</Link>
							</Button>
						</div>

						<Card className="rounded-2xl shadow-xl dark:bg-background/80">
							<CardContent className="p-6">
								<ScrollArea className="h-[400px] w-full">
									{loading && (
										<div className="flex items-center justify-center h-32">
											<p className="text-muted-foreground">Loading sessions...</p>
										</div>
									)}

									{!loading && upcomingSessions.length === 0 && (
										<div className="text-center py-8">
											<Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
											<p className="text-muted-foreground">No upcoming sessions</p>
										</div>
									)}

									{!loading && upcomingSessions.length > 0 && (
										<div className="space-y-4 w-full max-w-full">
											{upcomingSessions.map((session) => (
												<div
													key={session.id}
													className="p-4 rounded-xl border hover:bg-muted/50 transition-colors w-full max-w-full overflow-hidden">
													<div className="flex items-start justify-between w-full max-w-full">
														<div className="flex-1 min-w-0">
															<h4 className="font-medium text-sm truncate">
																{session.title}
															</h4>
															<div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
																<span className="flex items-center gap-1">
																	<Calendar className="h-3 w-3" />
																	{new Date(session.date).toLocaleDateString()}
																</span>
																<span className="flex items-center gap-1">
																	<Clock className="h-3 w-3" />
																	{session.time}
																</span>
															</div>
															<div className="flex items-center gap-2 mt-2">
																<Badge variant="outline" className="text-xs">
																	{session.type}
																</Badge>
																<span className="text-xs text-muted-foreground truncate">
																	with {session.trainer}
																</span>
															</div>
														</div>
														<div className="text-right flex-shrink-0">
															<div className="text-xs text-muted-foreground">
																{session.capacity.booked}/
																{session.capacity.total}
															</div>
															<Badge
																variant={
																	session.status === "Available"
																		? "secondary"
																		: "default"
																}
																className="text-xs mt-1">
																{session.status}
															</Badge>
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</ScrollArea>
							</CardContent>
						</Card>
					</div>
				</div>



				{/* Activity Detail Dialog */}
				<Dialog
					open={isActivityDialogOpen}
					onOpenChange={setIsActivityDialogOpen}>
					<DialogContent className="max-w-2xl rounded-2xl">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								{selectedActivity && getActivityIcon(selectedActivity.type)}
								Activity Details
							</DialogTitle>
							<DialogDescription>{selectedActivity?.message}</DialogDescription>
						</DialogHeader>
						{selectedActivity && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label className="text-sm font-medium">Type</Label>
										<p className="text-sm">
											{selectedActivity.type.replace("_", " ")}
										</p>
									</div>
									<div>
										<Label className="text-sm font-medium">Timestamp</Label>
										<p className="text-sm">
											{new Date(selectedActivity.timestamp).toLocaleString()}
										</p>
									</div>
									<div>
										<Label className="text-sm font-medium">Status</Label>
										<div className="flex items-center gap-2">
											{getStatusBadge(selectedActivity.status)}
										</div>
									</div>
									<div>
										<Label className="text-sm font-medium">Priority</Label>
										<div className="flex items-center gap-2">
											{getPriorityBadge(selectedActivity.priority)}
										</div>
									</div>
								</div>
								{selectedActivity.details && (
									<div>
										<Label className="text-sm font-medium">Details</Label>
										<div className="mt-1 p-3 bg-muted rounded-md">
											<pre className="text-sm whitespace-pre-wrap">
												{formatActivityDetails(selectedActivity)}
											</pre>
										</div>
									</div>
								)}
								<div className="flex gap-2">
									{selectedActivity.memberId && (
										<Button variant="outline" size="sm" asChild>
											<Link
												href={`/admin/members/${selectedActivity.memberId}`}>
												View Member
												<ExternalLink className="h-3 w-3 ml-1" />
											</Link>
										</Button>
									)}
									{selectedActivity.sessionId && (
										<Button variant="outline" size="sm" asChild>
											<Link
												href={`/admin/sessions/${selectedActivity.sessionId}`}>
												View Session
												<ExternalLink className="h-3 w-3 ml-1" />
											</Link>
										</Button>
									)}
								</div>
							</div>
						)}
					</DialogContent>
				</Dialog>
			</div>
		</AdminRoute>
	);
}
