"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, Package, TrendingUp, Clock } from "lucide-react";
import { UserDropdown } from "@/components/ui/user-dropdown";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Add interfaces for all dashboard data
interface MemberData {
	name: string;
	membershipType: string;
	joinDate: string;
	nextSession: NextSession | null;
	fitnessGoals?: string | null;
}
interface NextSession {
	type: string;
	trainer: string;
	date: string;
	time: string;
}
interface PackageData {
	name: string;
	remaining: number;
	total: number;
	expiry: string;
}
interface RecentSession {
	id: string;
	type: string;
	trainer: string;
	date: string;
	status: string;
}
interface Notification {
	id: string;
	title: string;
	message: string;
	is_read: boolean;
	created_at: string;
}
interface ProgressData {
	weight: number | null;
	bodyFat: number | null;
	muscleMass: number | null;
	measurementDate?: string | null;
}

export default function MemberDashboard() {
	const auth = useAuth();
	const { toast } = useToast();

	// Use these types in useState
	const [memberData, setMemberData] = useState<MemberData | null>(null);
	const [packages, setPackages] = useState<PackageData[]>([]);
	const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [progressData, setProgressData] = useState<ProgressData>({
		weight: null,
		bodyFat: null,
		muscleMass: null,
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (auth.user) {
			loadMemberDashboardData();
		}
	}, [auth.user]);

	const loadMemberDashboardData = async () => {
		try {
			setLoading(true);
			const supabase = createClient();

			if (!auth.user) {
				return;
			}

			// Get member profile
			const { data: memberProfile, error: memberError } = await supabase
				.from("members")
				.select(
					`
          id,
          joined_at,
          membership_status,
          user_id,
          fitness_goals,
          weight,
          height
        `
				)
				.eq("user_id", auth.user.id)
				.single();

			if (memberError || !memberProfile) {
				console.error("Error loading member profile:", memberError);
				toast({
					title: "Error Loading Member Data",
					description: "Could not load your member profile.",
					variant: "destructive",
				});
				setLoading(false);
				return;
			}

			// Update member data
			setMemberData({
				name:
					auth.userProfile?.full_name ||
					auth.user?.user_metadata?.full_name ||
					auth.user?.email?.split("@")[0] ||
					"Member",
				membershipType:
					memberProfile.membership_status === "active"
						? "Active Member"
						: "Inactive Member",
				joinDate: new Date(memberProfile.joined_at).toLocaleDateString(),
				nextSession: null, // Will be populated later
				fitnessGoals: memberProfile.fitness_goals,
			});

			// In the member_packages query, use a join for package name
			const { data: packagesData, error: packagesError } = await supabase
				.from("member_packages")
				.select(
					`
          id,
          sessions_remaining,
          sessions_total,
          end_date,
          status,
          package_id,
          packages (name)
        `
				)
				.eq("member_id", memberProfile.id)
				.eq("status", "active")
				.order("end_date", { ascending: true });

			if (packagesError) {
				console.error("Error loading packages:", packagesError);
			} else {
				// In the mapping for packages, handle array or object for pkg.packages
				const transformedPackages = (packagesData || []).map((pkg) => {
					let packageName = "Package";
					const pkgObj = pkg.packages as
						| { name?: string }
						| { name?: string }[]
						| undefined;
					if (pkgObj) {
						if (Array.isArray(pkgObj)) {
							packageName = pkgObj[0]?.name || "Package";
						} else if (typeof pkgObj === "object") {
							packageName = pkgObj.name || "Package";
						}
					}
					return {
						name: packageName,
						remaining: pkg.sessions_remaining || 0,
						total: pkg.sessions_total || 0,
						expiry: new Date(pkg.end_date).toLocaleDateString(),
					};
				});
				setPackages(transformedPackages);
			}

			// In the bookings query, join sessions → trainers → profiles, and select profiles.full_name
			const { data: bookingsData, error: bookingsError } = await supabase
				.from("bookings")
				.select(
					`
					id,
					status,
					booking_time,
					attended,
					session_id,
					sessions (
						title,
						trainer_id,
						start_time,
						end_time,
						location,
						trainers (
							user_id,
							profiles (full_name)
						)
					)
				`
				)
				.eq("member_id", memberProfile.id)
				.order("booking_time", { ascending: false })
				.limit(5);

			if (bookingsError) {
				console.error("Error loading recent sessions:", bookingsError);
			} else {
				// In the mapping, use the joined data for trainer name
				const transformedSessions = (bookingsData || []).map((booking) => {
					let sessionType = "Session";
					let trainerName = "Trainer";
					if (booking.sessions) {
						const sessionObj = Array.isArray(booking.sessions)
							? booking.sessions[0]
							: booking.sessions;
						if (sessionObj) {
							sessionType = sessionObj.title || "Session";
							if (sessionObj.trainers) {
								const trainerObj = Array.isArray(sessionObj.trainers)
									? sessionObj.trainers[0]
									: sessionObj.trainers;
								if (trainerObj && trainerObj.profiles) {
									const profileObj = Array.isArray(trainerObj.profiles)
										? trainerObj.profiles[0]
										: trainerObj.profiles;
									if (profileObj) {
										trainerName = profileObj.full_name || "Trainer";
									}
								}
							}
						}
					}
					return {
						id: booking.id,
						type: sessionType,
						trainer: trainerName,
						date: new Date(booking.booking_time).toLocaleDateString(),
						status: booking.attended
							? "Completed"
							: booking.status === "confirmed"
							? "Upcoming"
							: "Cancelled",
					};
				});
				setRecentSessions(transformedSessions);

				// Find next upcoming session
				const upcomingSessions = transformedSessions.filter(
					(session) => session.status === "Upcoming"
				);
				if (upcomingSessions.length > 0) {
					const nextSession = upcomingSessions[0];
					setMemberData((prev) =>
						prev
							? {
									name: prev.name || "Member",
									membershipType: prev.membershipType || "",
									joinDate: prev.joinDate || "",
									fitnessGoals: prev.fitnessGoals,
									nextSession: {
										type: nextSession.type,
										trainer: nextSession.trainer,
										date: nextSession.date,
										time: "Check sessions for time",
									},
							  }
							: prev
					);
				}
			}

			// Load notifications (with error handling)
			try {
				const { data: notificationsData, error: notificationsError } =
					await supabase
						.from("notifications")
						.select("id, title, message, is_read, created_at")
						.eq("user_id", auth.user.id)
						.order("created_at", { ascending: false })
						.limit(10);

				if (notificationsError) {
					console.error("Error loading notifications:", notificationsError);
				} else {
					setNotifications(notificationsData || []);
					const unread = (notificationsData || []).filter(
						(notification) => !notification.is_read
					).length;
					setUnreadCount(unread);
				}
			} catch (error) {
				console.error("Notifications table might not exist:", error);
				setNotifications([]);
				setUnreadCount(0);
			}

			// Load latest progress data (with error handling)
			try {
				const { data: progressData, error: progressError } = await supabase
					.from("progress_tracking")
					.select("weight, body_fat_percentage, muscle_mass, measurement_date")
					.eq("member_id", memberProfile.id)
					.order("measurement_date", { ascending: false })
					.maybeSingle();

				if (progressError) {
					console.error("Error loading progress data:", progressError);
				} else if (progressData) {
					setProgressData({
						weight: progressData.weight,
						bodyFat: progressData.body_fat_percentage,
						muscleMass: progressData.muscle_mass,
						measurementDate: progressData.measurement_date,
					});
				} else {
					// Use initial data from members table if available
					setProgressData({
						weight: memberProfile.weight ?? null,
						bodyFat: null,
						muscleMass: memberProfile.height ?? null, // height as a proxy for initial muscle mass
						measurementDate: memberProfile.joined_at ?? undefined,
					});
				}
			} catch (error) {
				console.error("Progress tracking table might not exist:", error);
				setProgressData({
					weight: null,
					bodyFat: null,
					muscleMass: null,
				});
			}
		} catch (error) {
			console.error("Error loading dashboard data:", error);
			toast({
				title: "Error Loading Dashboard",
				description: "Failed to load dashboard data. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto max-w-7xl py-6 space-y-6">
			{/* Glassy, gradient-backed header */}
			<div className="relative mb-8">
				<div className="absolute inset-0 h-32 bg-gradient-to-br from-blue-900/60 to-gray-900/80 rounded-2xl blur-lg -z-10" />
				<div className="flex items-center gap-6 p-6 rounded-2xl shadow-xl bg-background/80 dark:bg-background/60 backdrop-blur border border-border">
					<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold border-4 border-primary shadow-lg">
						{memberData?.name?.[0] || "?"}
					</div>
					<div>
						<div className="font-bold text-2xl flex items-center gap-2">
							{memberData?.name}
							<Badge
								variant={
									memberData?.membershipType === "Active Member"
										? "default"
										: "destructive"
								}
								className="ml-2">
								{memberData?.membershipType}
							</Badge>
						</div>
						<div className="text-muted-foreground text-sm">
							Member since {memberData?.joinDate}
						</div>
						{memberData?.fitnessGoals && (
							<div className="mt-1 text-sm">
								<b>Fitness Goals:</b> {memberData.fitnessGoals}
							</div>
						)}
					</div>
					<div className="flex-1 flex justify-end items-center gap-2">
						<Button
							asChild
							className="bg-orange-500 hover:bg-orange-600 text-white">
							<Link href="/member/book-session">
								<Calendar className="mr-2 h-4 w-4" />
								Book Session
							</Link>
						</Button>
						<div className="relative">
							<Button variant="outline" size="icon" asChild>
								<Link href="/member/notifications">
									<Bell className="h-4 w-4" />
									{unreadCount > 0 && (
										<Badge
											variant="destructive"
											className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
											{unreadCount}
										</Badge>
									)}
								</Link>
							</Button>
						</div>
						<UserDropdown />
					</div>
				</div>
			</div>

			{/* Next Session Card */}
			{memberData?.nextSession && (
				<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
					<CardHeader>
						<CardTitle className="flex items-center">
							<Calendar className="mr-2 h-5 w-5" />
							Next Session
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
							<div>
								<h3 className="font-medium text-lg">
									{memberData.nextSession.type}
								</h3>
								<p className="text-muted-foreground">
									with {memberData.nextSession.trainer}
								</p>
								<p className="text-sm">
									{memberData.nextSession.date} at {memberData.nextSession.time}
								</p>
							</div>
							<Button variant="outline" asChild>
								<Link href="/member/book-session">Manage Sessions</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Package Overview */}
			{packages.length > 0 && (
				<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
					<CardHeader>
						<CardTitle className="flex items-center">
							<Package className="mr-2 h-5 w-5" />
							Your Packages
						</CardTitle>
						<CardDescription>
							Current package status and remaining sessions
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{packages.map((pkg, index) => (
								<div key={index} className="border rounded-lg p-4">
									<h3 className="font-medium">{pkg.name}</h3>
									<div className="mt-2 space-y-1">
										<p className="text-sm">
											<span className="text-muted-foreground">Remaining: </span>
											<span
												className={
													pkg.remaining === 0
														? "text-red-500 font-medium"
														: "font-medium"
												}>
												{pkg.remaining}/{pkg.total}
											</span>
										</p>
										<p className="text-sm">
											<span className="text-muted-foreground">Expires: </span>
											<span>{pkg.expiry}</span>
										</p>
									</div>
									<div className="w-full bg-muted rounded-full h-2 mt-2">
										<div
											className="bg-primary h-2 rounded-full"
											style={{
												width: `${(pkg.remaining / pkg.total) * 100}%`,
											}}></div>
									</div>
								</div>
							))}
						</div>
						<Button
							variant="outline"
							className="w-full mt-4 bg-transparent"
							asChild>
							<Link href="/member/packages">Manage Packages</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Fitness Progress */}
				{loading ? (
					<div className="space-y-4">
						<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
						<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
						<div className="h-4 bg-gray-200 rounded animate-pulse"></div>
					</div>
				) : (
					<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
						<CardHeader>
							<CardTitle className="flex items-center">
								<TrendingUp className="mr-2 h-5 w-5" />
								Fitness Progress
							</CardTitle>
							<CardDescription>
								Your latest measurements and progress
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">Weight</span>
									<span className="font-medium">
										{progressData.weight
											? `${progressData.weight} kg`
											: "Not recorded"}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">
										Body Fat
									</span>
									<span className="font-medium">
										{progressData.bodyFat
											? `${progressData.bodyFat}%`
											: "Not recorded"}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm text-muted-foreground">
										Muscle Mass
									</span>
									<span className="font-medium">
										{progressData.muscleMass
											? `${progressData.muscleMass} kg`
											: "Not recorded"}
									</span>
								</div>
							</div>
							<Button
								variant="outline"
								className="w-full mt-4 bg-transparent"
								asChild>
								<Link href="/member/progress">View Detailed Progress</Link>
							</Button>
						</CardContent>
					</Card>
				)}

				{/* Recent Sessions */}
				{recentSessions.length > 0 && (
					<Card className="rounded-2xl shadow-xl dark:bg-background/80 mb-6">
						<CardHeader>
							<CardTitle className="flex items-center">
								<Clock className="mr-2 h-5 w-5" />
								Recent Sessions
							</CardTitle>
							<CardDescription>Your latest training sessions</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{recentSessions.map((session) => (
									<div
										key={session.id}
										className="flex items-center justify-between">
										<div>
											<p className="font-medium text-sm">{session.type}</p>
											<p className="text-xs text-muted-foreground">
												{session.trainer} • {session.date}
											</p>
										</div>
										<Badge variant="secondary">{session.status}</Badge>
									</div>
								))}
							</div>
							<Button
								variant="outline"
								className="w-full mt-4 bg-transparent"
								asChild>
								<Link href="/member/book-session?tab=booked">
									View All Sessions
								</Link>
							</Button>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
