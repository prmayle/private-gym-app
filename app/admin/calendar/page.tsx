"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserDropdown } from "@/components/ui/user-dropdown";
import { AdminRoute } from "@/components/ProtectedRoute";
import { createClient } from "@/utils/supabase/client";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Users,
	Clock,
	ArrowLeft,
	ChevronDown,
	ChevronUp,
	CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

interface Session {
	id: string;
	title: string;
	start_time: string;
	end_time: string;
	status: string;
	current_bookings: number;
	max_capacity: number;
	trainer_id?: string;
}

interface CalendarDay {
	date: Date;
	isCurrentMonth: boolean;
	isToday: boolean;
	sessions: Session[];
}

type ViewType = "daily" | "weekly" | "monthly";

export default function CalendarPage() {
	const router = useRouter();
	const { toast } = useToast();
	const [sessions, setSessions] = useState<Session[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentDate, setCurrentDate] = useState(new Date());
	const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
	
	// Mobile tab state
	const [activeView, setActiveView] = useState<ViewType>("daily");
	const [selectedDay, setSelectedDay] = useState(new Date());
	const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

	useEffect(() => {
		loadSessions();
	}, [currentDate]);

	// Reset to daily view when month changes
	useEffect(() => {
		setActiveView("daily");
		setSelectedDay(new Date());
		setExpandedDays(new Set([new Date().toDateString()]));
	}, [currentDate]);

	const loadSessions = async () => {
		try {
			setLoading(true);
			const supabase = createClient();

			// Get start and end of current month
			const startOfMonth = new Date(
				currentDate.getFullYear(),
				currentDate.getMonth(),
				1
			);
			const endOfMonth = new Date(
				currentDate.getFullYear(),
				currentDate.getMonth() + 1,
				0,
				23,
				59,
				59
			);

			const { data, error } = await supabase
				.from("sessions")
				.select(
					`
          id, 
          title, 
          start_time, 
          end_time, 
          status, 
          current_bookings, 
          max_capacity,
          trainer_id
        `
				)
				.gte("start_time", startOfMonth.toISOString())
				.lte("start_time", endOfMonth.toISOString())
				.order("start_time", { ascending: true });

			if (error) throw error;

			// Process sessions to update status based on date logic
			const processedSessions = await processSessionStatuses(data || []);

			setSessions(processedSessions);
			generateCalendarDays(processedSessions);
		} catch (error) {
			console.error("Error loading sessions:", error);
			toast({
				title: "Error",
				description: "Failed to load sessions",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const processSessionStatuses = async (sessions: Session[]) => {
		const supabase = createClient();
		const now = new Date();
		const updatedSessions = [...sessions];
		const sessionsToUpdate: { id: string; status: string }[] = [];

		// Check each session and update status if needed
		updatedSessions.forEach((session) => {
			const sessionEndTime = new Date(session.end_time);

			// If session is scheduled and has passed its end time, mark as completed
			if (session.status === "scheduled" && sessionEndTime < now) {
				session.status = "completed";
				sessionsToUpdate.push({ id: session.id, status: "completed" });
			}
			// For other statuses (cancelled, completed, etc.), keep as is
		});

		// Update sessions in database if any need updating
		if (sessionsToUpdate.length > 0) {
			try {
				// Update all sessions that need status changes
				for (const sessionUpdate of sessionsToUpdate) {
					const { error } = await supabase
						.from("sessions")
						.update({ status: sessionUpdate.status })
						.eq("id", sessionUpdate.id);

					if (error) {
						console.error(`Error updating session ${sessionUpdate.id}:`, error);
					}
				}

				// Show toast notification if sessions were updated
				if (sessionsToUpdate.length > 0) {
					toast({
						title: "Sessions Updated",
						description: `${sessionsToUpdate.length} session(s) automatically marked as completed.`,
					});
				}
			} catch (error) {
				console.error("Error updating session statuses:", error);
			}
		}

		return updatedSessions;
	};

	const generateCalendarDays = (sessions: Session[]) => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();

		// Get first day of month and last day of month
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		// Get start of calendar (including previous month days)
		const startDate = new Date(firstDay);
		startDate.setDate(startDate.getDate() - firstDay.getDay());

		// Get end of calendar (including next month days)
		const endDate = new Date(lastDay);
		endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

		const days: CalendarDay[] = [];
		const iterDate = new Date(startDate);

		while (iterDate <= endDate) {
			const daySessions = sessions.filter((session) => {
				const sessionDate = new Date(session.start_time);
				return sessionDate.toDateString() === iterDate.toDateString();
			});

			days.push({
				date: new Date(iterDate),
				isCurrentMonth: iterDate.getMonth() === month,
				isToday: iterDate.toDateString() === new Date().toDateString(),
				sessions: daySessions,
			});

			iterDate.setDate(iterDate.getDate() + 1);
		}

		setCalendarDays(days);
	};

	// Unified navigation functions
	const goToPrevious = () => {
		if (activeView === "daily") {
			const newDay = new Date(selectedDay);
			newDay.setDate(newDay.getDate() - 1);
			setSelectedDay(newDay);
		} else if (activeView === "weekly") {
			const newWeek = new Date(selectedDay);
			newWeek.setDate(newWeek.getDate() - 7);
			setSelectedDay(newWeek);
		} else {
			// monthly
			setCurrentDate(
				new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
			);
		}
	};

	const goToNext = () => {
		if (activeView === "daily") {
			const newDay = new Date(selectedDay);
			newDay.setDate(newDay.getDate() + 1);
			setSelectedDay(newDay);
		} else if (activeView === "weekly") {
			const newWeek = new Date(selectedDay);
			newWeek.setDate(newWeek.getDate() + 7);
			setSelectedDay(newWeek);
		} else {
			// monthly
			setCurrentDate(
				new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
			);
		}
	};

	const goToToday = () => {
		const today = new Date();
		setCurrentDate(today);
		setSelectedDay(today);
		setExpandedDays(new Set([today.toDateString()]));
	};

	// Weekly view helpers
	const getWeekDays = () => {
		const startOfWeek = new Date(selectedDay);
		startOfWeek.setDate(selectedDay.getDate() - selectedDay.getDay());
		
		const weekDays = [];
		for (let i = 0; i < 7; i++) {
			const day = new Date(startOfWeek);
			day.setDate(startOfWeek.getDate() + i);
			weekDays.push(day);
		}
		return weekDays;
	};

	const toggleDayExpansion = (dateString: string) => {
		const newExpanded = new Set(expandedDays);
		if (newExpanded.has(dateString)) {
			newExpanded.delete(dateString);
		} else {
			newExpanded.add(dateString);
		}
		setExpandedDays(newExpanded);
	};

	const getSessionsForDate = (date: Date) => {
		return sessions.filter((session) => {
			const sessionDate = new Date(session.start_time);
			return sessionDate.toDateString() === date.toDateString();
		});
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "scheduled":
				return "bg-blue-100 text-blue-800";
			case "completed":
				return "bg-green-100 text-green-800";
			case "cancelled":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getCapacityColor = (booked: number, total: number) => {
		const percentage = (booked / total) * 100;
		if (percentage >= 90) return "text-red-600";
		if (percentage >= 70) return "text-yellow-600";
		return "text-green-600";
	};

	// Get current period display text
	const getCurrentPeriodText = () => {
		if (activeView === "daily") {
			return selectedDay.toLocaleDateString("en-US", {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric",
			});
		} else if (activeView === "weekly") {
			const weekDays = getWeekDays();
			const start = weekDays[0];
			const end = weekDays[6];
			return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
		} else {
			return currentDate.toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			});
		}
	};

	// Mobile Tab Navigator Component
	const MobileTabNavigator = () => (
		<div className="block sm:hidden mb-4">
			<Card className="rounded-2xl shadow-xl dark:bg-background/80">
				<CardContent className="p-2">
					<div className="flex rounded-lg bg-muted p-1">
						{[
							{ key: "daily", label: "Daily", icon: CalendarDays },
							{ key: "weekly", label: "Weekly", icon: Calendar },
							{ key: "monthly", label: "Monthly", icon: Calendar },
						].map((tab) => (
							<button
								key={tab.key}
								onClick={() => setActiveView(tab.key as ViewType)}
								className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
									activeView === tab.key
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}>
								<tab.icon className="h-4 w-4" />
								{tab.label}
							</button>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);

	// Unified Navigation Component
	const UnifiedNavigation = () => (
		<Card className="rounded-2xl shadow-xl dark:bg-background/80">
			<CardContent className="p-4 sm:p-6">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					{/* Navigation Controls */}
					<div className="flex items-center justify-center gap-4">
						<Button variant="outline" size="sm" onClick={goToPrevious}>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<div className="text-center min-w-0 flex-1">
							<h2 className="text-lg sm:text-2xl font-bold truncate">
								{getCurrentPeriodText()}
							</h2>
							{/* Show current view indicator on mobile */}
							<div className="block sm:hidden mt-1">
								<Badge variant="outline" className="text-xs">
									{activeView.charAt(0).toUpperCase() + activeView.slice(1)} View
								</Badge>
							</div>
						</div>
						<Button variant="outline" size="sm" onClick={goToNext}>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
					
					{/* Action Buttons */}
					<div className="flex items-center justify-center gap-2 sm:gap-3">
						<Button variant="outline" onClick={goToToday} size="sm">
							Today
						</Button>
						<Button asChild size="sm">
							<Link href="/admin/sessions">
								<span className="hidden sm:inline">Manage Sessions</span>
								<span className="sm:hidden">Manage</span>
							</Link>
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);

	// Daily View Component
	const DailyView = () => {
		const daySessions = getSessionsForDate(selectedDay);
		
		return (
			<Card className="rounded-2xl shadow-xl dark:bg-background/80">
				<CardContent className="p-4">
					{/* Sessions for the day */}
					<div className="space-y-3">
						{daySessions.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
								<p>No sessions scheduled for this day</p>
							</div>
						) : (
							daySessions.map((session) => (
								<div
									key={session.id}
									className="p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer"
									onClick={() => router.push(`/admin/sessions/${session.id}`)}>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<h4 className="font-medium text-sm">{session.title}</h4>
											<p className="text-muted-foreground text-xs mt-1">
												{formatTime(session.start_time)} - {formatTime(session.end_time)}
											</p>
										</div>
										<div className="flex flex-col items-end gap-1">
											<Badge
												variant="secondary"
												className={`text-xs ${getStatusColor(session.status)}`}>
												{session.status}
											</Badge>
											<span
												className={`text-xs ${getCapacityColor(
													session.current_bookings,
													session.max_capacity
												)}`}>
												{session.current_bookings}/{session.max_capacity}
											</span>
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</CardContent>
			</Card>
		);
	};

	// Weekly View Component
	const WeeklyView = () => {
		const weekDays = getWeekDays();
		
		return (
			<Card className="rounded-2xl shadow-xl dark:bg-background/80">
				<CardContent className="p-4">
					<div className="space-y-3">
						{weekDays.map((day) => {
							const daySessions = getSessionsForDate(day);
							const dayString = day.toDateString();
							const isExpanded = expandedDays.has(dayString);
							const isToday = day.toDateString() === new Date().toDateString();
							
							return (
								<div key={dayString} className="border border-border rounded-lg">
									<button
										onClick={() => toggleDayExpansion(dayString)}
										className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
										<div className="flex items-center gap-3">
											<div className="text-left">
												<div className="font-medium text-sm">
													{day.toLocaleDateString("en-US", { weekday: "short" })}
												</div>
												<div className="text-xs text-muted-foreground">
													{day.getDate()}
												</div>
											</div>
											{isToday && (
												<Badge variant="secondary" className="text-xs">
													Today
												</Badge>
											)}
										</div>
										<div className="flex items-center gap-2">
											{daySessions.length > 0 && (
												<Badge variant="outline" className="text-xs">
													{daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
												</Badge>
											)}
											{isExpanded ? (
												<ChevronUp className="h-4 w-4" />
											) : (
												<ChevronDown className="h-4 w-4" />
											)}
										</div>
									</button>
									
									{isExpanded && (
										<div className="border-t border-border p-3 bg-muted/20">
											{daySessions.length === 0 ? (
												<p className="text-sm text-muted-foreground text-center py-2">
													No sessions scheduled
												</p>
											) : (
												<div className="space-y-2">
													{daySessions.map((session) => (
														<div
															key={session.id}
															className="p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer"
															onClick={() => router.push(`/admin/sessions/${session.id}`)}>
															<div className="flex items-start justify-between">
																<div className="flex-1">
																	<h4 className="font-medium text-sm">{session.title}</h4>
																	<p className="text-muted-foreground text-xs mt-1">
																		{formatTime(session.start_time)} - {formatTime(session.end_time)}
																	</p>
																</div>
																<div className="flex flex-col items-end gap-1">
																	<Badge
																		variant="secondary"
																		className={`text-xs ${getStatusColor(session.status)}`}>
																		{session.status}
																	</Badge>
																	<span
																		className={`text-xs ${getCapacityColor(
																			session.current_bookings,
																			session.max_capacity
																		)}`}>
																		{session.current_bookings}/{session.max_capacity}
																	</span>
																</div>
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>
		);
	};

	return (
		<AdminRoute>
			<div className="container mx-auto max-w-7xl py-6 space-y-6 px-4">
				{/* Header */}
				<PageHeader
					title="Session Calendar"
					subtitle="View and manage all sessions in calendar format"
					icon={Calendar}
					hasAddButton={false}
				/>

				{/* Mobile Tab Navigator */}
				<MobileTabNavigator />

				{/* Unified Navigation */}
				<UnifiedNavigation />

				{/* Mobile Views */}
				<div className="block sm:hidden">
					{activeView === "daily" && <DailyView />}
					{activeView === "weekly" && <WeeklyView />}
					{activeView === "monthly" && (
						<Card className="rounded-2xl shadow-xl dark:bg-background/80">
							<CardContent className="p-2">
								{/* Day Headers */}
								<div className="grid grid-cols-7 gap-0.5 mb-2">
									{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
										<div
											key={index}
											className="text-center font-semibold text-xs text-muted-foreground py-1">
											{day}
										</div>
									))}
								</div>

								{/* Calendar Days */}
								<div className="grid grid-cols-7 gap-0.5">
									{calendarDays.map((day, index) => (
										<div
											key={index}
											className={`
											min-h-[60px] p-1 border rounded text-xs transition-colors
											${
												day.isCurrentMonth
													? "bg-background border-border"
													: "bg-muted/30 border-muted"
											}
											${day.isToday ? "ring-1 ring-primary ring-opacity-50" : ""}
											${!day.isCurrentMonth ? "opacity-50" : ""}
										`}>
											{/* Date Number */}
											<div
												className={`
													text-xs font-medium mb-1 text-center
													${
														day.isToday
															? "text-primary font-bold"
															: day.isCurrentMonth
															? "text-foreground"
															: "text-muted-foreground"
													}
												`}>
												{day.date.getDate()}
											</div>

											{/* Sessions - Show count only */}
											<div className="flex justify-center">
												{day.sessions.length > 0 && (
													<div 
														className="w-2 h-2 bg-primary rounded-full cursor-pointer"
														onClick={() => {
															// On mobile, navigate to first session or show day view
															if (day.sessions.length === 1) {
																router.push(`/admin/sessions/${day.sessions[0].id}`);
															} else {
																// Could implement a day detail view for multiple sessions
																router.push(`/admin/sessions`);
															}
														}}
													/>
												)}
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Desktop Calendar Grid */}
				<div className="hidden sm:block">
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardContent className="p-6">
							{/* Day Headers */}
							<div className="grid grid-cols-7 gap-1 mb-4">
								{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
									<div
										key={index}
										className="text-center font-semibold text-sm text-muted-foreground py-2">
										{day}
									</div>
								))}
							</div>

							{/* Calendar Days */}
							<div className="grid grid-cols-7 gap-1">
								{calendarDays.map((day, index) => (
									<div
										key={index}
										className={`
										min-h-[120px] p-2 border rounded text-sm transition-colors
										${
											day.isCurrentMonth
												? "bg-background border-border"
												: "bg-muted/30 border-muted"
										}
										${day.isToday ? "ring-2 ring-primary ring-opacity-50" : ""}
										${!day.isCurrentMonth ? "opacity-50" : ""}
									`}>
										{/* Date Number */}
										<div
											className={`
												text-sm font-medium mb-2 text-left
												${
													day.isToday
														? "text-primary font-bold"
														: day.isCurrentMonth
														? "text-foreground"
														: "text-muted-foreground"
												}
											`}>
											{day.date.getDate()}
										</div>

										{/* Sessions - Show full details */}
										<ScrollArea className="h-[80px]">
											<div className="space-y-1">
												{day.sessions.map((session) => (
													<div
														key={session.id}
														className="p-2 rounded text-xs cursor-pointer hover:bg-muted/50 transition-colors border-l-2 border-primary"
														onClick={() =>
															router.push(`/admin/sessions/${session.id}`)
														}>
														<div className="font-medium truncate">
															{session.title}
														</div>
														<div className="text-muted-foreground">
															{formatTime(session.start_time)}
														</div>
														<div className="flex items-center justify-between mt-1">
															<Badge
																variant="secondary"
																className={`text-xs ${getStatusColor(
																	session.status
																)}`}>
																{session.status}
															</Badge>
															<span
																className={`text-xs ${getCapacityColor(
																	session.current_bookings,
																	session.max_capacity
																)}`}>
																{session.current_bookings}/{session.max_capacity}
															</span>
														</div>
													</div>
												))}
											</div>
										</ScrollArea>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Mobile Legend */}
				<div className="block sm:hidden">
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardContent className="p-4">
							<h3 className="font-medium mb-2">Legend</h3>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<div className="w-2 h-2 bg-primary rounded-full" />
								<span>Days with sessions (tap to view)</span>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Session Summary */}
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="pb-2 sm:pb-6">
							<CardTitle className="flex items-center gap-2 text-base sm:text-lg">
								<Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
								This Month
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="text-2xl sm:text-3xl font-bold">{sessions.length}</div>
							<p className="text-xs sm:text-sm text-muted-foreground">Total Sessions</p>
						</CardContent>
					</Card>

					<Card className="rounded-2xl shadow-xl dark:bg-background/80">
						<CardHeader className="pb-2 sm:pb-6">
							<CardTitle className="flex items-center gap-2 text-base sm:text-lg">
								<Users className="h-4 w-4 sm:h-5 sm:w-5" />
								Upcoming
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="text-2xl sm:text-3xl font-bold text-blue-600">
								{
									sessions.filter(
										(s) =>
											new Date(s.start_time) > new Date() &&
											s.status === "scheduled"
									).length
								}
							</div>
							<p className="text-xs sm:text-sm text-muted-foreground">
								Scheduled Sessions
							</p>
						</CardContent>
					</Card>

					<Card className="rounded-2xl shadow-xl dark:bg-background/80 sm:col-span-2 md:col-span-1">
						<CardHeader className="pb-2 sm:pb-6">
							<CardTitle className="flex items-center gap-2 text-base sm:text-lg">
								<Clock className="h-4 w-4 sm:h-5 sm:w-5" />
								Completed
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="text-2xl sm:text-3xl font-bold text-green-600">
								{sessions.filter((s) => s.status === "completed").length}
							</div>
							<p className="text-xs sm:text-sm text-muted-foreground">
								Completed Sessions
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</AdminRoute>
	);
}
