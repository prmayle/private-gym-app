"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";
import {
	ArrowLeft,
	Search,
	Calendar,
	Clock,
	User,
	Users,
	ChevronRight,
	Filter,
	CheckCircle,
} from "lucide-react";

interface Session {
	id: string;
	title: string;
	date: string;
	time: string;
	type: string;
	trainer: string;
	status: "Inactive" | "Completed" | "Available" | "Full";
	capacity: { booked: number; total: number };
	bookedMembers?: string[];
	description?: string;
}

interface Member {
	id: string;
	name: string;
	email: string;
	packages: any[];
}

export default function SelectSessionPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();

	const memberId = searchParams.get("memberId");
	const memberName = searchParams.get("memberName");

	const [member, setMember] = useState<Member | null>(null);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [trainerFilter, setTrainerFilter] = useState("all");
	const [dateFilter, setDateFilter] = useState("all");
	const [bookedSessionIds, setBookedSessionIds] = useState<Set<string>>(
		new Set()
	);

	useEffect(() => {
		if (!memberId) {
			router.push("/admin/book-session");
			return;
		}
		loadMemberAndSessions();
	}, [memberId]);

	useEffect(() => {
		filterSessions();
	}, [sessions, searchTerm, typeFilter, trainerFilter, dateFilter, member]);

	const loadMemberAndSessions = async () => {
		try {
			setLoading(true);
			const supabase = createClient();

			// Load member data from Supabase
			const { data: memberData, error: memberError } = await supabase
				.from("members")
				.select(
					`
          id,
          user_id,
          joined_at,
          membership_status,
          profiles (
            id,
            email,
            full_name,
            phone
          )
        `
				)
				.eq("id", memberId)
				.single();

			if (memberError) {
				throw memberError;
			}

			// Load member packages to get current packages for this member
			const { data: memberPackagesData, error: packagesError } = await supabase
				.from("member_packages")
				.select(
					`
          id,
          member_id,
          sessions_remaining,
          status,
          start_date,
          end_date,
          packages (
            id,
            name,
            session_count,
            package_type_id,
            package_types (
              id,
              name
            )
          )
        `
				)
				.eq("member_id", memberId)
				.eq("status", "active")
				.gt("sessions_remaining", 0);

			if (packagesError) {
				console.error("Error loading member packages:", packagesError);
			}

			// Transform member data
			const memberPackages = (memberPackagesData || []).map((mp) => ({
				id: mp.id,
				name: (mp.packages as any)?.name || "Unknown Package",
				sessions: (mp.packages as any)?.session_count || 0,
				remaining: mp.sessions_remaining || 0,
				expiryDate: mp.end_date,
				type: (mp.packages as any)?.package_types?.name || "Unknown",
			}));

			const foundMember: Member = {
				id: memberData.id,
				name: (memberData.profiles as any)?.full_name || "No Name",
				email: (memberData.profiles as any)?.email || "No Email",
				packages: memberPackages,
			};

			setMember(foundMember);

			// Load available sessions from Supabase
			const { data: sessionsData, error: sessionsError } = await supabase
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
		description,
		trainer_id,
		package_id,
		packages (
			id,
			name,
			package_type_id,
			package_types (
				id,
				name
			)
		),
		trainers (
			profiles (
				full_name
			)
		)
	`
				)
				.eq("status", "scheduled")
				.gte("start_time", new Date().toISOString())
				.order("start_time", { ascending: true });

			if (sessionsError) {
				console.error("Error loading sessions:", sessionsError);
			}

			// Transform sessions data
			const transformedSessions: Session[] = (sessionsData || [])
				.map((session) => {
					const startTime = new Date(session.start_time);
					const endTime = new Date(session.end_time);
					const isAvailable =
						(session.current_bookings || 0) < (session.max_capacity || 1);

					let status: "Inactive" | "Completed" | "Available" | "Full" =
						"Available";
					if (!isAvailable) status = "Full";
					if (session.status === "completed") status = "Completed";
					if (session.status === "inactive") status = "Inactive";

					return {
						id: session.id,
						title: session.title,
						date: startTime.toISOString().split("T")[0],
						time: `${startTime.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})} - ${endTime.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}`,
						type: session.packages?.package_types?.name || "Unknown",
						trainer:
							(session.trainers as any)?.profiles?.full_name ||
							"Unknown Trainer",
						status,
						capacity: {
							booked: session.current_bookings || 0,
							total: session.max_capacity || 1,
						},
						bookedMembers: [],
						description: session.description || "",
					};
				})
				.filter((session) => session.status === "Available");

			setSessions(transformedSessions);

			// Load member's booked sessions
			const { data: bookingsData, error: bookingsError } = await supabase
				.from("bookings")
				.select(
					`
					id,
					session_id,
					status,
					sessions (
						id,
						title,
						start_time,
						end_time,
						status,
						trainers (
							profiles (
								full_name
							)
						),
						packages (
							package_types (
								name
							)
						)
					)
				`
				)
				.eq("member_id", memberId)
				.in("status", ["confirmed", "attended", "completed"]);

			if (bookingsError) {
				console.error("Error loading bookings:", bookingsError);
			}

			const bookedSessionIds = new Set(
				(bookingsData || []).map((b: any) => b.session_id)
			);
			setBookedSessionIds(bookedSessionIds);
		} catch (error) {
			console.error("Error loading data:", error);
			toast({
				title: "Error Loading Data",
				description: "Failed to load member and session data.",
				variant: "destructive",
			});

			// If member not found, redirect back
			if (
				typeof error === "object" &&
				error !== null &&
				"message" in error &&
				typeof (error as any).message === "string" &&
				(error as any).message.includes("No rows found")
			) {
				router.push("/admin/book-session");
			}
		} finally {
			setLoading(false);
		}
	};

	const filterSessions = () => {
		if (!member) return;

		let filtered = sessions;

		// Get member's available package types
		const memberPackageTypes = member.packages
			?.filter((pkg: any) => {
				const remaining =
					typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0;
				return remaining > 0;
			})
			.map((pkg: any) =>
				typeof pkg === "object" && pkg.type ? pkg.type : pkg
			);

		// Only show sessions that match member's available packages
		filtered = filtered.filter((session) =>
			memberPackageTypes.includes(session.type)
		);

		// Apply search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(session) =>
					session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
					session.trainer.toLowerCase().includes(searchTerm.toLowerCase()) ||
					session.type.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Apply type filter
		if (typeFilter !== "all") {
			filtered = filtered.filter((session) => session.type === typeFilter);
		}

		// Apply trainer filter
		if (trainerFilter !== "all") {
			filtered = filtered.filter(
				(session) => session.trainer === trainerFilter
			);
		}

		// Apply date filter
		if (dateFilter !== "all") {
			const today = new Date();
			const tomorrow = new Date(today);
			tomorrow.setDate(today.getDate() + 1);
			const nextWeek = new Date(today);
			nextWeek.setDate(today.getDate() + 7);

			filtered = filtered.filter((session) => {
				const sessionDate = new Date(session.date);
				switch (dateFilter) {
					case "today":
						return sessionDate.toDateString() === today.toDateString();
					case "tomorrow":
						return sessionDate.toDateString() === tomorrow.toDateString();
					case "week":
						return sessionDate >= today && sessionDate <= nextWeek;
					default:
						return true;
				}
			});
		}

		// Sort by date and time
		filtered.sort((a, b) => {
			const dateA = new Date(`${a.date} ${a.time.split(" - ")[0]}`);
			const dateB = new Date(`${b.date} ${b.time.split(" - ")[0]}`);
			return dateA.getTime() - dateB.getTime();
		});

		setFilteredSessions(filtered);
	};

	const handleSelectSession = (session: Session) => {
		// Navigate to booking confirmation
		router.push(
			`/admin/book-session/confirm?memberId=${memberId}&memberName=${encodeURIComponent(
				memberName || ""
			)}&sessionId=${session.id}`
		);
	};

	const canBookSession = (session: Session) => {
		if (!member) return false;

		// Check if member has available sessions for this type
		const hasAvailablePackage = member.packages?.some((pkg: any) => {
			const remaining =
				typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0;
			const type = typeof pkg === "object" && pkg.type ? pkg.type : pkg;
			return remaining > 0 && type === session.type;
		});

		return (
			hasAvailablePackage &&
			session.status === "Available" &&
			session.capacity.booked < session.capacity.total
		);
	};

	const getMemberPackageInfo = (sessionType: string) => {
		if (!member) return null;
		return member.packages?.find((pkg: any) => {
			const type = typeof pkg === "object" && pkg.type ? pkg.type : pkg;
			const remaining =
				typeof pkg === "object" && pkg.remaining ? pkg.remaining : 0;
			return type === sessionType && remaining > 0;
		});
	};

	// Get unique values for filters
	const uniqueTypes = [...new Set(filteredSessions.map((s) => s.type))];
	const uniqueTrainers = [...new Set(filteredSessions.map((s) => s.trainer))];

	if (!member) {
		return (
			<div className="flex items-center justify-center h-64">
				<p>Loading member information...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center">
				<Button variant="ghost" size="icon" asChild className="mr-2">
					<Link href="/admin/book-session">
						<ArrowLeft className="h-5 w-5" />
						<span className="sr-only">Back to Member Selection</span>
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-bold">
						Select Session for {member.name}
					</h1>
					<p className="text-muted-foreground">
						Step 2: Choose an available session to book
					</p>
				</div>
			</div>

			{/* Member Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Member Information
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label className="text-sm font-medium">Name</Label>
							<p className="text-lg">{member.name}</p>
						</div>
						<div>
							<Label className="text-sm font-medium">Email</Label>
							<p>{member.email}</p>
						</div>
					</div>
					<div className="mt-4">
						<Label className="text-sm font-medium">Available Packages</Label>
						<div className="flex flex-wrap gap-2 mt-2">
							{member.packages
								?.filter((pkg: any) => {
									const remaining =
										typeof pkg === "object" && pkg.remaining
											? pkg.remaining
											: 0;
									return remaining > 0;
								})
								.map((pkg: any, index: number) => {
									const name =
										typeof pkg === "object" && pkg.name ? pkg.name : pkg;
									const remaining =
										typeof pkg === "object" && pkg.remaining
											? pkg.remaining
											: 0;
									return (
										<Badge key={index} variant="secondary">
											{name} ({remaining} sessions left)
										</Badge>
									);
								})}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Filter Sessions
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label htmlFor="search">Search</Label>
							<div className="relative">
								<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="search"
									placeholder="Search sessions..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-8"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="type-filter">Session Type</Label>
							<Select value={typeFilter} onValueChange={setTypeFilter}>
								<SelectTrigger>
									<SelectValue placeholder="All Types" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									{uniqueTypes.map((type) => (
										<SelectItem key={type} value={type}>
											{type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="trainer-filter">Trainer</Label>
							<Select value={trainerFilter} onValueChange={setTrainerFilter}>
								<SelectTrigger>
									<SelectValue placeholder="All Trainers" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Trainers</SelectItem>
									{uniqueTrainers.map((trainer) => (
										<SelectItem key={trainer} value={trainer}>
											{trainer}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="date-filter">Date Range</Label>
							<Select value={dateFilter} onValueChange={setDateFilter}>
								<SelectTrigger>
									<SelectValue placeholder="All Dates" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Dates</SelectItem>
									<SelectItem value="today">Today</SelectItem>
									<SelectItem value="tomorrow">Tomorrow</SelectItem>
									<SelectItem value="week">Next 7 Days</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Available Sessions */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Available Sessions ({filteredSessions.length})
					</CardTitle>
					<CardDescription>
						Sessions that match your member's available packages
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading && (
						<div className="flex items-center justify-center h-32">
							<p className="text-muted-foreground">Loading sessions...</p>
						</div>
					)}

					{!loading && filteredSessions.length === 0 && (
						<div className="text-center py-8">
							<Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-muted-foreground mb-2">
								No available sessions found for this member's packages.
							</p>
							<Button
								variant="outline"
								onClick={() => router.push("/admin/book-session")}>
								Select Different Member
							</Button>
						</div>
					)}

					{!loading && filteredSessions.length > 0 && (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Session Details</TableHead>
										<TableHead>Date & Time</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Trainer</TableHead>
										<TableHead>Capacity</TableHead>
										<TableHead>Package Match</TableHead>
										<TableHead className="text-right">Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredSessions.map((session) => {
										const packageInfo = getMemberPackageInfo(session.type);
										const canBook = canBookSession(session);
										const isBooked = bookedSessionIds.has(session.id);

										return (
											<TableRow key={session.id} className="hover:bg-muted/50">
												<TableCell>
													<div>
														<div className="font-medium">{session.title}</div>
														{session.description && (
															<div className="text-sm text-muted-foreground mt-1">
																{session.description}
															</div>
														)}
													</div>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-1">
														<Calendar className="h-3 w-3" />
														<span className="text-sm">
															{new Date(session.date).toLocaleDateString(
																"en-US",
																{
																	weekday: "short",
																	month: "short",
																	day: "numeric",
																}
															)}
														</span>
													</div>
													<div className="flex items-center gap-1 mt-1">
														<Clock className="h-3 w-3" />
														<span className="text-sm text-muted-foreground">
															{session.time}
														</span>
													</div>
												</TableCell>
												<TableCell>
													<Badge variant="outline">{session.type}</Badge>
												</TableCell>
												<TableCell>{session.trainer}</TableCell>
												<TableCell>
													<div className="flex items-center gap-1">
														<Users className="h-3 w-3" />
														<span className="text-sm">
															{session.capacity.booked}/{session.capacity.total}
														</span>
													</div>
												</TableCell>
												<TableCell>
													{packageInfo ? (
														<div className="flex items-center gap-1">
															<CheckCircle className="h-3 w-3 text-green-600" />
															<span className="text-sm text-green-600">
																{packageInfo.remaining || 0} sessions left
															</span>
														</div>
													) : (
														<span className="text-sm text-red-600">
															No matching package
														</span>
													)}
												</TableCell>
												<TableCell className="text-right">
													<Button
														onClick={() => handleSelectSession(session)}
														disabled={!canBook || isBooked}
														className="flex items-center gap-2">
														{canBook ? (
															<>
																Book Session
																<ChevronRight className="h-4 w-4" />
															</>
														) : (
															"Cannot Book"
														)}
														{isBooked && (
															<Badge variant="destructive" className="ml-2">
																Booked
															</Badge>
														)}
													</Button>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
