"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import { ReactivationDialog } from "@/components/ui/reactivation-dialog";
import { createClient } from "@/utils/supabase/client";
import { ActivityLogger } from "@/utils/activity-logger";
import { useAuth } from "@/contexts/AuthContext";
import { emailService } from "@/lib/email-service";
import { SessionTimeRangePicker } from "@/components/ui/date-time-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Edit,
	Eye,
	Power,
	PowerOff,
	Plus,
	Search,
	Filter,
	ChevronLeft,
	ChevronRight,
	Users,
	MoreHorizontal,
	UserPlus,
	Calendar,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { useTheme } from "@/components/theme-provider";

// Enhanced Session interface
export interface Session {
	id: string;
	title: string;
	date: string;
	time: string;
	trainer: string;
	status: "Inactive" | "Completed" | "Available" | "Full";
	capacity: { booked: number; total: number };
	bookedMembers?: string[];
	isManuallyDeactivated?: boolean;
	deactivatedAt?: string;
	reactivatedAt?: string;
	lastModified?: string;
	description?: string;
	packageName?: string;
	packageTypeName?: string;
	packageTypeId?: string;
	package_id?: string; // <-- add this line
	requiresPackage?: boolean;
	allowDropIn?: boolean;
	dropInPrice?: string;
	type?: string;
	start_time?: string; // Added for time display
	end_time?: string; // Added for time display
}

// Session status logic
const determineSessionStatus = (params: {
	date: string;
	capacity: { booked: number; total: number };
	isManuallyDeactivated?: boolean;
	bookedMembers?: string[];
}): Session["status"] => {
	const { date, capacity, isManuallyDeactivated, bookedMembers } = params;
	const sessionDate = new Date(date);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Priority 1: Inactive (manually deactivated)
	if (isManuallyDeactivated) {
		return "Inactive";
	}

	// Priority 2: Completed (past sessions with bookings)
	if (sessionDate < today && bookedMembers && bookedMembers.length > 0) {
		return "Completed";
	}

	// Priority 3: Full (upcoming and fully booked)
	if (sessionDate >= today && capacity.booked >= capacity.total) {
		return "Full";
	}

	// Priority 4: Available (upcoming with spots)
	return "Available";
};

const getAvailableActions = (status: Session["status"]): string[] => {
	switch (status) {
		case "Inactive":
			return ["reactivate", "view-details"];
		case "Completed":
			return ["view-details"];
		case "Available":
			return [
				"view-details",
				"edit-details",
				"deactivate",
				"mark-full",
				"book-member",
			];
		case "Full":
			return ["view-details", "edit-details"];
		default:
			return ["view-details"];
	}
};

const canDeactivateSession = (status: Session["status"]): boolean => {
	return status === "Available" || status === "Full";
};

const canReactivateSession = (status: Session["status"]): boolean => {
	return status === "Inactive";
};

const canEditSession = (status: Session["status"]): boolean => {
	return status === "Available" || status === "Full";
};

const canBookMember = (status: Session["status"]): boolean => {
	return status === "Available";
};

// Mock trainers and session types
// Trainers will be loaded from database

const sessionTypes = [
	"Personal Training",
	"Group Class",
	"Fitness Assessment",
	"Nutrition Consultation",
	"Yoga",
	"HIIT",
	"Pilates",
	"Strength Training",
];

// Session status and booking logic

// Pagination constants
const SESSIONS_PER_PAGE = 20;

// Activity logging helper - removed localStorage dependency
const logActivity = (activity: {
	type: string;
	message: string;
	details?: string;
	sessionId?: string;
	sessionTitle?: string;
	memberId?: string;
	memberName?: string;
	status?: string;
	priority?: string;
}) => {
	// Activity logging will be handled by dashboard data refresh
	console.log("Activity logged:", activity);
};

// Helper to generate slot options for the next 14 days
function generateSlotOptions(
	existingSessions: Session[]
): Array<{ label: string; date: string; time: string }> {
	const slots: Array<{ label: string; date: string; time: string }> = [];
	const slotTimes = [
		{ start: "08:00", end: "09:00" },
		{ start: "10:00", end: "11:00" },
		{ start: "12:00", end: "13:00" },
		{ start: "14:00", end: "15:00" },
		{ start: "16:00", end: "17:00" },
	];
	const today = new Date();
	for (let d = 0; d < 14; d++) {
		const dateObj = new Date(today);
		dateObj.setDate(today.getDate() + d);
		const dateStr = dateObj.toISOString().split("T")[0];
		for (const slot of slotTimes) {
			const label = `${dateStr} ${slot.start} - ${slot.end}`;
			slots.push({ label, date: dateStr, time: `${slot.start} - ${slot.end}` });
		}
	}
	return slots;
}

// Helper to format time as 12-hour (AM/PM) from UTC DB string
function formatTime12Hour(dateString?: string): string {
	if (!dateString) return "-";
	const date = new Date(dateString);
	if (isNaN(date.getTime())) return "-";
	let hours = date.getUTCHours();
	const minutes = date.getUTCMinutes();
	const ampm = hours >= 12 ? "pm" : "am";
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${pad(hours)}:${pad(minutes)} ${ampm}`;
}

export default function SessionsPage() {
	const router = useRouter();
	const { toast } = useToast();
	const auth = useAuth();
	const { theme } = useTheme();

	const [customSlots, setCustomSlots] = useState<Session[]>([]);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [trainers, setTrainers] = useState<
		Array<{ id: string; name: string; user_id: string }>
	>([]);
	const [loading, setLoading] = useState(true);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
	const [selectedSession, setSelectedSession] = useState<Session | null>(null);
	const [reactivationDialog, setReactivationDialog] = useState<{
		isOpen: boolean;
		session: Session | null;
	}>({
		isOpen: false,
		session: null,
	});

	// Add to state at the top of SessionsPage
	const [packages, setPackages] = useState<Array<{ id: string; name: string }>>(
		[]
	);
	const [packageTypes, setPackageTypes] = useState<
		Array<{ id: string; name: string }>
	>([]);

	// Filter and sort state
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [trainerFilter, setTrainerFilter] = useState<string>("all");
	const [sortBy, setSortBy] = useState<string>("date");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [currentPage, setCurrentPage] = useState(1);

	// Form state for creating new sessions
	const [newSession, setNewSession] = useState({
		title: "",
		startDate: undefined as Date | undefined,
		endDate: undefined as Date | undefined,
		trainer: "",
		capacity: 1,
		description: "",
		package: "none", // package id
		packageType: "none", // package type id
		requiresPackage: false,
		sessionCreditCost: 1,
		allowDropIn: true,
		dropInPrice: "",
	});

	// Booking state
	const [members, setMembers] = useState<any[]>([]);
	const [selectedMemberId, setSelectedMemberId] = useState("");
	const [availableMembers, setAvailableMembers] = useState<any[]>([]);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);

		try {
			const supabase = createClient();

			// Load sessions from database
			const { data: sessionsData, error: sessionsError } = await supabase
				.from("sessions")
				.select(
					`
          id,
          title,
          description,
          start_time,
          end_time,
          status,
          max_capacity,
          current_bookings,
          location,
          equipment_needed,
          trainer_id,
          package_id,
          requires_package,
          package_session_credit_cost,
          allow_drop_in,
          drop_in_price
        `
				)
				.order("start_time", { ascending: true });

			if (sessionsError) {
				console.error("Error loading sessions:", sessionsError);
				// Don't throw, just continue with fallback
			}

			// Process sessions to update status based on date logic
			const processedSessionsData = await processSessionStatuses(
				sessionsData || []
			);

			// Load trainers separately (with error handling)
			let trainersData: Array<{ id: string; name: string; user_id: string }> =
				[];
			try {
				const { data, error: trainersError } = await supabase.from("trainers")
					.select(`
            id,
            user_id,
            profiles!trainers_user_id_fkey (
              full_name
            )
          `);

				if (trainersError) {
					console.error("Error loading trainers:", trainersError);
				} else {
					trainersData = (data || []).map((trainer: any) => {
						let fullName = "Unknown Trainer";
						if (Array.isArray(trainer.profiles)) {
							fullName = trainer.profiles[0]?.full_name || "Unknown Trainer";
						} else if (
							trainer.profiles &&
							typeof trainer.profiles === "object"
						) {
							fullName = trainer.profiles.full_name || "Unknown Trainer";
						}
						return {
							id: trainer.id,
							name: fullName,
							user_id: trainer.user_id,
						};
					});
					setTrainers(trainersData);
				}
			} catch (error) {
				console.error("Trainers table might not exist:", error);
			}

			// Load bookings to get booked members for each session
			const { data: bookingsData, error: bookingsError } = await supabase
				.from("bookings")
				.select(
					`
          session_id,
          status,
          member_id
        `
				)
				.eq("status", "confirmed");

			if (bookingsError) {
				console.error("Error loading bookings:", bookingsError);
			}

			// Load packages
			const { data: packagesData, error: packagesError } = await supabase
				.from("packages")
				.select("id, name")
				.eq("is_active", true);
			if (!packagesError && packagesData) setPackages(packagesData);
			// Load package types
			const { data: packageTypesData, error: packageTypesError } =
				await supabase
					.from("package_types")
					.select("id, name")
					.eq("is_active", true);
			if (!packageTypesError && packageTypesData)
				setPackageTypes(packageTypesData);

			// Transform sessions data to match expected format
			const transformedSessions: Session[] = processedSessionsData.map(
				(session) => {
					const sessionBookings = (bookingsData || []).filter(
						(b) => b.session_id === session.id
					);
					const bookedMembers = sessionBookings
						.map((b) => "Member")
						.filter(Boolean);

					// Format date and time
					const startTime = new Date(session.start_time);
					const endTime = new Date(session.end_time);
					const date = startTime.toISOString().split("T")[0];
					const time = `${startTime.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})} - ${endTime.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}`;

					// Find trainer name for this session
					const sessionTrainer = trainersData.find(
						(t) => t.id === session.trainer_id
					);

					const transformedSession: Session = {
						id: session.id,
						title: session.title,
						date: date,
						time: time,
						trainer: sessionTrainer?.name || "Unassigned",
						status: session.status as Session["status"],
						capacity: {
							booked: session.current_bookings || 0,
							total: session.max_capacity || 1,
						},
						bookedMembers: bookedMembers,
						description: session.description,
						lastModified: session.start_time,
						packageName:
							packagesData?.find((p) => p.id === session.package_id)?.name ||
							"N/A",
						package_id: session.package_id,
						requiresPackage: session.requires_package,
						allowDropIn: session.allow_drop_in,
						dropInPrice: session.drop_in_price,
						type: undefined,
						start_time: session.start_time,
						end_time: session.end_time,
					};

					// Use the processed status from the database (already updated by processSessionStatuses)
					transformedSession.status = session.status as Session["status"];

					return transformedSession;
				}
			);

			setSessions(transformedSessions);

			// Load members with their packages
			const { data: membersData, error: membersError } = await supabase
				.from("members")
				.select(
					`
          id,
          membership_status,
          user_id
        `
				)
				.eq("membership_status", "active");

			if (membersError) {
				console.error("Error loading members:", membersError);
			}

			// Load member packages with package type information
			const { data: memberPackagesData, error: packageError } = await supabase
				.from("member_packages")
				.select(
					`
          id,
          member_id,
          sessions_remaining,
          sessions_total,
          status,
          package_id,
          packages (
            name,
            session_count
          )
        `
				)
				.eq("status", "active")
				.gt("sessions_remaining", 0);

			if (packageError) {
				console.error("Error loading member packages:", packageError);
			}

			// Get profile information for members
			const memberIds = (membersData || []).map((m) => m.user_id);
			const { data: profilesData, error: profilesError } = await supabase
				.from("profiles")
				.select("id, full_name, email")
				.in("id", memberIds);

			if (profilesError) {
				console.error("Error loading member profiles:", profilesError);
			}

			// Transform members data with real package types
			const transformedMembers = (membersData || []).map((member) => {
				const profile = (profilesData || []).find(
					(p) => p.id === member.user_id
				);
				const memberPackages = (memberPackagesData || [])
					.filter((mp) => mp.member_id === member.id)
					.map((mp: any) => {
						let packageTypeId = "";
						let pkg = mp.packages;
						if (Array.isArray(pkg)) {
							pkg = pkg[0] || {};
						}
						if (pkg && pkg.package_type_id) {
							packageTypeId = pkg.package_type_id;
						} else if (mp.package_type_id) {
							packageTypeId = mp.package_type_id;
						}
						return {
							id: mp.id,
							name: pkg && pkg.name ? pkg.name : "Package",
							remaining: mp.sessions_remaining || 0,
							total:
								pkg && pkg.session_count
									? pkg.session_count
									: mp.sessions_total || 0,
							package_type_id: packageTypeId || "",
							package_id: mp.package_id || "", // <-- add this line
						};
					});

				return {
					id: member.id,
					name: profile?.full_name || `Member ${member.id}`,
					email: profile?.email || "No email",
					status: member.membership_status || "active",
					packages: memberPackages,
				};
			});

			setMembers(transformedMembers);
		} catch (error) {
			console.error("Error loading data:", error);
			// No fallback - let user know there's an issue
			setSessions([]);
			setMembers([]);
			toast({
				title: "Data Loading Error",
				description:
					"Failed to load sessions data. Please check your database connection.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const processSessionStatuses = async (sessions: any[]) => {
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

	// Filter and sort sessions
	const filteredAndSortedSessions = useMemo(() => {
		const filtered = sessions.filter((session) => {
			const matchesSearch =
				(session.title || "")
					.toLowerCase()
					.includes((searchTerm || "").toLowerCase()) ||
				(session.trainer || "")
					.toLowerCase()
					.includes((searchTerm || "").toLowerCase()) ||
				(session.packageTypeName || "")
					.toLowerCase()
					.includes((searchTerm || "").toLowerCase());

			const matchesStatus =
				statusFilter === "all" || session.status === statusFilter;
			const matchesType =
				typeFilter === "all" || session.packageTypeName === typeFilter;
			const matchesTrainer =
				trainerFilter === "all" || session.trainer === trainerFilter;

			return matchesSearch && matchesStatus && matchesType && matchesTrainer;
		});

		// Sort sessions
		filtered.sort((a, b) => {
			let aValue: any;
			let bValue: any;

			switch (sortBy) {
				case "date":
					aValue = new Date(`${a.date} ${a.time.split(" - ")[0]}`);
					bValue = new Date(`${b.date} ${b.time.split(" - ")[0]}`);
					break;
				case "status":
					aValue = a.status;
					bValue = b.status;
					break;
				case "type":
					aValue = a.packageTypeName;
					bValue = b.packageTypeName;
					break;
				case "trainer":
					aValue = a.trainer;
					bValue = b.trainer;
					break;
				case "capacity":
					aValue = a.capacity.booked / a.capacity.total;
					bValue = b.capacity.booked / b.capacity.total;
					break;
				default:
					aValue = a.title;
					bValue = b.title;
			}

			if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
			if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
			return 0;
		});

		return filtered;
	}, [
		sessions,
		searchTerm,
		statusFilter,
		typeFilter,
		trainerFilter,
		sortBy,
		sortOrder,
	]);

	// Pagination
	const totalPages = Math.ceil(
		filteredAndSortedSessions.length / SESSIONS_PER_PAGE
	);
	const paginatedSessions = filteredAndSortedSessions.slice(
		(currentPage - 1) * SESSIONS_PER_PAGE,
		currentPage * SESSIONS_PER_PAGE
	);

	// Reset to first page when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, statusFilter, typeFilter, trainerFilter, sortBy, sortOrder]);

	const handleCreateSession = async () => {
		if (
			!newSession.title ||
			!newSession.startDate ||
			!newSession.endDate ||
			!newSession.trainer
		) {
			toast({
				title: "Validation Error",
				description: "Please fill in all required fields",
				variant: "destructive",
			});
			return;
		}

		// Validate that end time is after start time
		if (newSession.endDate <= newSession.startDate) {
			toast({
				title: "Validation Error",
				description: "End time must be after start time",
				variant: "destructive",
			});
			return;
		}

		try {
			setLoading(true);
			const supabase = createClient();

			// Insert into sessions table
			const { data: sessionData, error: sessionError } = await supabase
				.from("sessions")
				.insert({
					title: newSession.title,
					description: newSession.description,
					trainer_id: newSession.trainer || null,
					start_time: newSession.startDate.toISOString(),
					end_time: newSession.endDate.toISOString(),
					status: "scheduled",
					max_capacity: newSession.capacity,
					current_bookings: 0,
					drop_in_price: 0, // Default price, could be made configurable
					location: null,
					equipment_needed: [],
					package_id: newSession.package === "none" ? null : newSession.package,
					// package_type_id: newSession.packageType === "none" ? null : newSession.packageType,
					requires_package: newSession.requiresPackage,
					package_session_credit_cost: newSession.sessionCreditCost,
					allow_drop_in: newSession.allowDropIn,
					drop_in_price: newSession.allowDropIn
						? newSession.dropInPrice || null
						: null,
				})
				.select()
				.single();

			if (sessionError) {
				throw sessionError;
			}

			// Log activity
			if (auth.user && sessionData) {
				const selectedTrainer = trainers.find(
					(t) => t.id === newSession.trainer
				);
				await ActivityLogger.sessionCreated(
					newSession.title,
					sessionData.id,
					auth.user.id,
					selectedTrainer?.name || "Unknown Trainer"
				);
			}

			// Reload data to get fresh from database
			await loadData();

			// Reset form
			setNewSession({
				title: "",
				startDate: undefined,
				endDate: undefined,
				trainer: "",
				capacity: 1,
				description: "",
				package: "none",
				packageType: "none",
				requiresPackage: false,
				sessionCreditCost: 1,
				allowDropIn: true,
				dropInPrice: "",
			});

			setIsCreateDialogOpen(false);

			toast({
				title: "Session Created",
				description: `${newSession.title} has been created successfully`,
			});
		} catch (error) {
			console.error("Error creating session:", error);
			toast({
				title: "Error",
				description: "Failed to create session",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleBookMember = (session: Session) => {
		setSelectedSession(session);

		// Enhanced filter for members who have packages matching this session's package or package type
		const eligible = members.filter((member) => {
			if (!member.packages || member.packages.length === 0) {
				return false;
			}

			return member.packages.some((pkg: any) => {
				console.log("member packages inside");
				console.log(pkg);
				console.log("session here");
				console.log(session);
				const remaining = pkg.remaining || 0;
				const packageId = pkg.package_id || "";
				const packageTypeId = pkg.package_type_id || "";

				// Must have remaining sessions
				if (remaining <= 0) return false;

				// If session requires a specific package
				if (session.package_id && packageId === session.package_id) {
					return true;
				}

				// If session requires a package type
				if (
					!session.package_id &&
					session.packageTypeId &&
					packageTypeId === session.packageTypeId
				) {
					return true;
				}

				return false;
			});
		});

		console.log("Session type:", session.packageTypeName);
		console.log("Total members:", members.length);
		console.log("Eligible members:", eligible.length);
		console.log(
			"Member packages:",
			members.map((m) => ({ name: m.name, packages: m.packages }))
		);

		setAvailableMembers(eligible);
		setSelectedMemberId("");
		setIsBookingDialogOpen(true);
	};

	const handleConfirmBooking = async () => {
		if (!selectedSession || !selectedMemberId) {
			toast({
				title: "Selection Required",
				description: "Please select a member to book for this session.",
				variant: "destructive",
			});
			return;
		}

		try {
			setLoading(true);
			const supabase = createClient();

			const selectedMember = members.find((m) => m.id === selectedMemberId);
			if (!selectedMember) {
				throw new Error("Selected member not found");
			}

			// Check if this is a sample member (for testing when no real data exists)
			if (selectedMemberId.startsWith("sample-")) {
				// Handle sample member booking (mock success)

				// Simulate successful booking by updating local state
				const updatedSessions = sessions.map((s) =>
					s.id === selectedSession.id
						? {
								...s,
								capacity: { ...s.capacity, booked: s.capacity.booked + 1 },
						  }
						: s
				);
				setSessions(updatedSessions);

				toast({
					title: "Booking Confirmed (Sample)",
					description: `${selectedSession.title} has been successfully booked for ${selectedMember.name} (This is sample data)`,
				});

				setIsBookingDialogOpen(false);
				setSelectedSession(null);
				setSelectedMemberId("");
				return;
			}

			// Find matching package for the member with better logic
			const { data: memberPackages, error: packageError } = await supabase
				.from("member_packages")
				.select(
					`
          id,
          sessions_remaining,
          packages (
            name
          )
        `
				)
				.eq("member_id", selectedMemberId)
				.eq("status", "active")
				.gt("sessions_remaining", 0);

			if (packageError) {
				throw packageError;
			}

			if (!memberPackages || memberPackages.length === 0) {
				throw new Error(
					"No active packages with remaining sessions found for this member"
				);
			}

			// Find the best matching package for this session type
			let selectedPackage = null;
			const sessionPackageTypeId = selectedSession?.packageTypeId || "";

			for (const pkg of memberPackages) {
				const packageTypeId = pkg.package_type_id || "";

				// Direct match
				if (
					packageTypeId &&
					sessionPackageTypeId &&
					packageTypeId === sessionPackageTypeId
				) {
					selectedPackage = pkg;
					break;
				}
			}

			// If no perfect match, use first available package
			if (!selectedPackage) {
				selectedPackage = memberPackages[0];
			}

			// Create booking record
			const { data: bookingData, error: bookingError } = await supabase
				.from("bookings")
				.insert({
					member_id: selectedMemberId,
					session_id: selectedSession.id,
					member_package_id: selectedPackage.id,
					booking_time: new Date().toISOString(),
					status: "confirmed",
					attended: false,
					notes: "Booked by admin",
				})
				.select()
				.single();

			if (bookingError) {
				throw bookingError;
			}

			// Update member package sessions remaining
			const { error: updatePackageError } = await supabase
				.from("member_packages")
				.update({
					sessions_remaining: selectedPackage.sessions_remaining - 1,
					updated_at: new Date().toISOString(),
				})
				.eq("id", selectedPackage.id);

			if (updatePackageError) {
				throw updatePackageError;
			}

			// Update session current bookings
			const { error: updateSessionError } = await supabase
				.from("sessions")
				.update({
					current_bookings: (selectedSession.capacity.booked || 0) + 1,
					updated_at: new Date().toISOString(),
				})
				.eq("id", selectedSession.id);

			if (updateSessionError) {
				throw updateSessionError;
			}

			// Log activity
			if (auth.user) {
				await ActivityLogger.sessionBooked(
					selectedSession.title,
					selectedMember.name,
					selectedSession.id,
					auth.user.id
				);
			}

			// Reload data to reflect changes
			await loadData();

			setIsBookingDialogOpen(false);
			setSelectedSession(null);
			setSelectedMemberId("");

			toast({
				title: "Booking Confirmed",
				description: `${selectedSession.title} has been successfully booked for ${selectedMember.name}`,
			});
		} catch (error) {
			console.error("Error booking session:", error);
			toast({
				title: "Booking Failed",
				description:
					error instanceof Error
						? error.message
						: "Failed to book the session. Please try again.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleMarkAsFull = async (session: Session) => {
		if (session.status !== "Available") {
			toast({
				title: "Cannot Mark as Full",
				description: "Only available sessions can be marked as full",
				variant: "destructive",
			});
			return;
		}

		try {
			setLoading(true);
			const supabase = createClient();

			// Update session to mark as full
			const { error: updateError } = await supabase
				.from("sessions")
				.update({
					current_bookings: session.capacity.total,
					updated_at: new Date().toISOString(),
				})
				.eq("id", session.id);

			if (updateError) {
				throw updateError;
			}

			// Reload data to reflect changes
			await loadData();

			toast({
				title: "Session Marked as Full",
				description: `${session.title} is now marked as full`,
			});
		} catch (error) {
			console.error("Error marking session as full:", error);
			toast({
				title: "Error",
				description: "Failed to mark session as full",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleDeactivateSession = async (session: Session) => {
		if (!canDeactivateSession(session.status)) return;

		try {
			setLoading(true);
			const supabase = createClient();

			// Update session status to cancelled
			const { error: updateError } = await supabase
				.from("sessions")
				.update({
					status: "cancelled",
					updated_at: new Date().toISOString(),
				})
				.eq("id", session.id);

			if (updateError) {
				throw updateError;
			}

			// Get bookings to notify members before cancelling
			const { data: bookingsToCancel, error: fetchBookingsError } =
				await supabase
					.from("bookings")
					.select(
						`
          id,
          members!inner (
            profiles!inner (
              full_name,
              email
            )
          )
        `
					)
					.eq("session_id", session.id)
					.eq("status", "confirmed");

			if (fetchBookingsError) {
				console.error("Error fetching bookings:", fetchBookingsError);
			}

			// Cancel all bookings for this session
			const { error: cancelBookingsError } = await supabase
				.from("bookings")
				.update({
					status: "cancelled",
					cancelled_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.eq("session_id", session.id)
				.eq("status", "confirmed");

			if (cancelBookingsError) {
				console.error("Error cancelling bookings:", cancelBookingsError);
			}

			// Send cancellation emails to affected members
			if (bookingsToCancel && bookingsToCancel.length > 0) {
				try {
					const membersToNotify = bookingsToCancel
						.map((booking: any) => ({
							name: booking.members?.profiles?.full_name || "Member",
							email: booking.members?.profiles?.email || "",
						}))
						.filter((member) => member.email);

					if (membersToNotify.length > 0) {
						const emailResult = await emailService.sendBulkCancellationNotices(
							session.title,
							session.date,
							session.time,
							membersToNotify,
							"Session cancelled by administrator"
						);
					}
				} catch (emailError) {
					console.error("Error sending cancellation emails:", emailError);
					// Don't fail the cancellation if email fails
				}
			}

			// Reload data to reflect changes
			await loadData();

			toast({
				title: "Session Deactivated",
				description: `Session deactivated and ${
					bookingsToCancel?.length || 0
				} members notified via email.`,
			});
		} catch (error) {
			console.error("Error deactivating session:", error);
			toast({
				title: "Error",
				description: "Failed to deactivate session",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleReactivateSession = async (
		session: Session,
		data: { start_time: string; end_time: string; notes?: string }
	) => {
		if (!canReactivateSession(session.status)) return;

		try {
			setLoading(true);
			const supabase = createClient();

			// Update session to reactivate with provided UTC times
			const { error: updateError } = await supabase
				.from("sessions")
				.update({
					status: "scheduled",
					start_time: data.start_time,
					end_time: data.end_time,
					updated_at: new Date().toISOString(),
				})
				.eq("id", session.id);

			if (updateError) {
				throw updateError;
			}

			// Reload data to reflect changes
			await loadData();

			toast({
				title: "Session Reactivated",
				description: `The session has been reactivated for ${data.start_time} - ${data.end_time} (UTC).`,
			});

			setReactivationDialog({ isOpen: false, session: null });
		} catch (error) {
			console.error("Error reactivating session:", error);
			toast({
				title: "Error",
				description: "Failed to reactivate session",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleEditSession = (session: Session) => {
		if (!canEditSession(session.status)) return;
		router.push(`/admin/sessions/${session.id}`);
	};

	const handleViewDetails = (session: Session) => {
		router.push(`/admin/sessions/${session.id}`);
	};

	const handleBackToDashboard = () => {
		router.push("/admin");
	};

	const handleSort = (field: string) => {
		if (sortBy === field) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(field);
			setSortOrder("asc");
		}
	};

	const clearFilters = () => {
		setSearchTerm("");
		setStatusFilter("all");
		setTypeFilter("all");
		setTrainerFilter("all");
		setSortBy("date");
		setSortOrder("asc");
	};

	// Get unique values for filters
	const uniquePackageTypes = [
		...new Set(sessions.map((s) => s.packageTypeName).filter(Boolean)),
	];
	const uniqueTrainers = trainers.filter((trainer) =>
		sessions.some((session) => session.trainer === trainer.name)
	);

	// Remove slotOptions

	return (
		<div className="min-h-screen bg-background">
			{/* Modern Header */}
			<PageHeader
				title="Sessions Management"
				subtitle="Create, manage, and monitor gym sessions"
				icon={Calendar}
				// hasAddButton={true}
				// addLink="/admin/sessions/new"
			/>

			{/* Main Content with top padding to account for fixed header */}
			<div className="pt-0">
				<div className="container mx-auto max-w-7xl py-6 space-y-6 px-4">
					{/* Additional Actions */}
					<div className="flex items-center justify-end gap-3">
						<Button
							variant="outline"
							onClick={() => router.push("/admin/calendar")}
							className="flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							View Calendar
						</Button>
						<Dialog
							open={isCreateDialogOpen}
							onOpenChange={setIsCreateDialogOpen}>
							<DialogTrigger asChild>
								<Button className="flex items-center gap-2">
									<Plus className="h-4 w-4" />
									Create Session
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[500px]">
								<DialogHeader>
									<DialogTitle>Create New Session</DialogTitle>
									<DialogDescription>
										Add a new session. Fill in all required information.
									</DialogDescription>
								</DialogHeader>
								<div className="grid gap-4 py-4">
									<div className="grid gap-2">
										<Label htmlFor="title">Session Title *</Label>
										<Input
											id="title"
											value={newSession.title}
											onChange={(e) =>
												setNewSession((prev) => ({
													...prev,
													title: e.target.value,
												}))
											}
											placeholder="e.g., Personal Training - John Doe"
										/>
									</div>

									<SessionTimeRangePicker
										startDate={newSession.startDate}
										endDate={newSession.endDate}
										onStartDateChange={(date) =>
											setNewSession((prev) => ({ ...prev, startDate: date }))
										}
										onEndDateChange={(date) =>
											setNewSession((prev) => ({ ...prev, endDate: date }))
										}
									/>

									<div className="grid gap-2">
										<Label htmlFor="trainer">Trainer *</Label>
										<Select
											value={newSession.trainer}
											onValueChange={(value) =>
												setNewSession((prev) => ({ ...prev, trainer: value }))
											}>
											<SelectTrigger>
												<SelectValue placeholder="Select trainer" />
											</SelectTrigger>
											<SelectContent>
												{trainers.map((trainer) => (
													<SelectItem key={trainer.id} value={trainer.id}>
														{trainer.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="grid gap-2">
										<Label htmlFor="capacity">Capacity</Label>
										<Input
											id="capacity"
											type="number"
											min="1"
											max="50"
											value={newSession.capacity}
											onChange={(e) =>
												setNewSession((prev) => ({
													...prev,
													capacity: Number.parseInt(e.target.value) || 1,
												}))
											}
										/>
									</div>

									<div className="grid gap-2">
										<Label htmlFor="description">Description</Label>
										<Textarea
											id="description"
											value={newSession.description}
											onChange={(e) =>
												setNewSession((prev) => ({
													...prev,
													description: e.target.value,
												}))
											}
											placeholder="Optional session description..."
										/>
									</div>

									<div className="grid gap-2">
										<Label htmlFor="package">Package</Label>
										<Select
											value={newSession.package}
											onValueChange={(value) =>
												setNewSession((prev) => ({ ...prev, package: value }))
											}>
											<SelectTrigger>
												<SelectValue placeholder="Select package" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">No Package Required</SelectItem>
												{packages.map((pkg) => (
													<SelectItem key={pkg.id} value={pkg.id}>
														{pkg.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="requiresPackage"
											checked={newSession.requiresPackage}
											onChange={(e) =>
												setNewSession((prev) => ({
													...prev,
													requiresPackage: e.target.checked,
												}))
											}
										/>
										<Label htmlFor="requiresPackage">Requires Package</Label>
									</div>

									{newSession.requiresPackage && (
										<div className="grid gap-2">
											<Label htmlFor="sessionCreditCost">Session Credit Cost</Label>
											<Input
												id="sessionCreditCost"
												type="number"
												min="1"
												value={newSession.sessionCreditCost}
												onChange={(e) =>
													setNewSession((prev) => ({
														...prev,
														sessionCreditCost: Number.parseInt(e.target.value) || 1,
													}))
												}
											/>
										</div>
									)}

									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id="allowDropIn"
											checked={newSession.allowDropIn}
											onChange={(e) =>
												setNewSession((prev) => ({
													...prev,
													allowDropIn: e.target.checked,
												}))
											}
										/>
										<Label htmlFor="allowDropIn">Allow Drop-In</Label>
									</div>
									{newSession.allowDropIn && (
										<div className="grid gap-2">
											<Label htmlFor="dropInPrice">Drop-In Price</Label>
											<Input
												id="dropInPrice"
												type="number"
												min="0"
												value={newSession.dropInPrice}
												onChange={(e) =>
													setNewSession((prev) => ({
														...prev,
														dropInPrice: e.target.value,
													}))
												}
											/>
										</div>
									)}
								</div>
								<DialogFooter>
									<Button
										variant="outline"
										onClick={() => setIsCreateDialogOpen(false)}>
										Cancel
									</Button>
									<Button onClick={handleCreateSession}>Create Session</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>

					{/* Filters and Search */}
					<Card className="border border-border/50 shadow-sm">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Filter className="h-5 w-5" />
								Filters & Search
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
								<div className="space-y-2">
									<Label htmlFor="search">Search Sessions</Label>
									<div className="relative">
										<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
										<Input
											id="search"
											placeholder="Search by title, trainer, or type..."
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className="pl-8"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="status-filter">Status</Label>
									<Select value={statusFilter} onValueChange={setStatusFilter}>
										<SelectTrigger>
											<SelectValue placeholder="All Statuses" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Statuses</SelectItem>
											<SelectItem value="Available">Available</SelectItem>
											<SelectItem value="Full">Full</SelectItem>
											<SelectItem value="Completed">Completed</SelectItem>
											<SelectItem value="Inactive">Inactive</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="package-type-filter">Package Type</Label>
									<Select value={typeFilter} onValueChange={setTypeFilter}>
										<SelectTrigger>
											<SelectValue placeholder="All Package Types" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Package Types</SelectItem>
											{packages.map((p) => (
												<SelectItem key={p.id} value={p.id}>
													{p.name}
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
												<SelectItem key={trainer.id} value={trainer.name}>
													{trainer.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<Label htmlFor="sort-by">Sort by:</Label>
										<Select value={sortBy} onValueChange={setSortBy}>
											<SelectTrigger className="w-[140px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="date">Date</SelectItem>
												<SelectItem value="title">Title</SelectItem>
												<SelectItem value="trainer">Trainer</SelectItem>
												<SelectItem value="status">Status</SelectItem>
												<SelectItem value="capacity">Capacity</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
										{sortOrder === "asc" ? "↑" : "↓"}
									</Button>
								</div>
								<Button variant="outline" size="sm" onClick={clearFilters}>
									Clear Filters
								</Button>
							</div>
						</CardContent>
					</Card>

					{/* Sessions Table */}
					<Card className="border border-border/50 shadow-sm">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								Sessions
							</CardTitle>
						</CardHeader>
						<CardContent>
							{loading ? (
								<div className="space-y-4">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={i} className="h-16 w-full" />
									))}
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead
												className="cursor-pointer"
												onClick={() => handleSort("title")}>
												Title {sortBy === "title" && (sortOrder === "asc" ? "↑" : "↓")}
											</TableHead>
											<TableHead
												className="cursor-pointer"
												onClick={() => handleSort("date")}>
												Date & Time {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
											</TableHead>
											<TableHead
												className="cursor-pointer"
												onClick={() => handleSort("trainer")}>
												Trainer {sortBy === "trainer" && (sortOrder === "asc" ? "↑" : "↓")}
											</TableHead>
											<TableHead
												className="cursor-pointer"
												onClick={() => handleSort("status")}>
												Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
											</TableHead>
											<TableHead
												className="cursor-pointer"
												onClick={() => handleSort("capacity")}>
												Capacity {sortBy === "capacity" && (sortOrder === "asc" ? "↑" : "↓")}
											</TableHead>
											<TableHead>Package Required</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{paginatedSessions.map((session) => (
											<TableRow key={session.id}>
												<TableCell>
													<div>
														<div className="font-medium">{session.title}</div>
														{session.description && (
															<div className="text-sm text-muted-foreground">
																{session.description}
															</div>
														)}
													</div>
												</TableCell>
												<TableCell>
													<div>
														<div className="font-medium">{session.date}</div>
														<div className="text-sm text-muted-foreground">
															{session.time}
														</div>
													</div>
												</TableCell>
												<TableCell>{session.trainer}</TableCell>
												<TableCell>
													<StatusBadge status={session.status} />
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														<Users className="h-3 w-3" />
														<span className="text-sm">
															{session.capacity.booked}/{session.capacity.total}
														</span>
													</div>
													{session.bookedMembers &&
														session.bookedMembers.length > 0 && (
															<div className="text-xs text-muted-foreground mt-1">
																{session.bookedMembers.slice(0, 2).join(", ")}
																{session.bookedMembers.length > 2 &&
																	` +${session.bookedMembers.length - 2}`}
															</div>
														)}
												</TableCell>
												<TableCell>
													{session.requiresPackage ? "Yes" : "No"}
												</TableCell>
												<TableCell>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="sm">
																<MoreHorizontal className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={() => handleViewDetails(session)}>
																<Eye className="h-4 w-4 mr-2" />
																View Details
															</DropdownMenuItem>

															{canEditSession(session.status) && (
																<DropdownMenuItem
																	onClick={() => handleEditSession(session)}>
																	<Edit className="h-4 w-4 mr-2" />
																	Edit Session
																</DropdownMenuItem>
															)}

															{canBookMember(session.status) && (
																<DropdownMenuItem
																	onClick={() => handleBookMember(session)}>
																	<UserPlus className="h-4 w-4 mr-2" />
																	Book Member
																</DropdownMenuItem>
															)}

															{session.status === "Available" && (
																<DropdownMenuItem
																	onClick={() => handleMarkAsFull(session)}>
																	<Users className="h-4 w-4 mr-2" />
																	Mark as Full
																</DropdownMenuItem>
															)}

															{canDeactivateSession(session.status) && (
																<DropdownMenuItem
																	onClick={() => handleDeactivateSession(session)}
																	className="text-red-600">
																	<PowerOff className="h-4 w-4 mr-2" />
																	Deactivate
																</DropdownMenuItem>
															)}

															{canReactivateSession(session.status) && (
																<DropdownMenuItem
																	onClick={() =>
																		setReactivationDialog({
																			isOpen: true,
																			session,
																		})
																	}>
																	<Power className="h-4 w-4 mr-2" />
																	Reactivate
																</DropdownMenuItem>
															)}
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex items-center justify-between">
									<div className="text-sm text-muted-foreground">
										Showing {(currentPage - 1) * SESSIONS_PER_PAGE + 1} to{" "}
										{Math.min(
											currentPage * SESSIONS_PER_PAGE,
											filteredAndSortedSessions.length
										)}{" "}
										of {filteredAndSortedSessions.length} sessions
									</div>
									<div className="flex items-center space-x-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCurrentPage(currentPage - 1)}
											disabled={currentPage === 1}>
											<ChevronLeft className="h-4 w-4" />
											Previous
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCurrentPage(currentPage + 1)}
											disabled={currentPage === totalPages}>
											Next
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Book Member Dialog */}
					<Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
						<DialogContent className="sm:max-w-[500px]">
							<DialogHeader>
								<DialogTitle>Book Member for Session</DialogTitle>
								<DialogDescription>
									Select a member to book for "{selectedSession?.title}"
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								{selectedSession && (
									<div className="p-4 bg-muted/30 rounded-lg">
										<h4 className="font-medium mb-2">Session Details</h4>
										<div className="text-sm space-y-1">
											<div>
												<strong>Title:</strong> {selectedSession.title}
											</div>
											<div>
												<strong>Date:</strong>{" "}
												{selectedSession?.start_time
													? new Date(selectedSession.start_time)
															.toISOString()
															.split("T")[0]
													: "-"}
											</div>
											<div>
												<strong>Time:</strong>{" "}
												{formatTime12Hour(selectedSession?.start_time)} -{" "}
												{formatTime12Hour(selectedSession?.end_time)}
											</div>
											<div>
												<strong>Type:</strong> {selectedSession.packageTypeName}
											</div>
											<div>
												<strong>Trainer:</strong> {selectedSession.trainer}
											</div>
											<div>
												<strong>Capacity:</strong>{" "}
												{selectedSession.capacity.booked + 1}/
												{selectedSession.capacity.total} after booking
											</div>
										</div>
									</div>
								)}

								<div className="grid gap-2">
									<Label htmlFor="member">Select Member *</Label>
									<Select
										value={selectedMemberId}
										onValueChange={setSelectedMemberId}>
										<SelectTrigger>
											<SelectValue placeholder="Choose a member with matching package" />
										</SelectTrigger>
										<SelectContent className="max-h-48">
											{availableMembers.length > 0
												? availableMembers
														.sort((a, b) => a.name.localeCompare(b.name))
														.map((member) => {
															const matchingPackages =
																member.packages?.filter((pkg: any) => {
																	console.log(pkg);
																	const remaining = pkg.remaining || 0;
																	const packageId = pkg.package_id || "";
																	const packageTypeId = pkg.package_type_id || "";
																	if (remaining <= 0) return false;
																	if (
																		packageId &&
																		selectedSession?.package_id &&
																		packageId === selectedSession.package_id
																	)
																		return true;
																	if (
																		!selectedSession?.package_id &&
																		packageTypeId &&
																		selectedSession?.packageTypeId &&
																		packageTypeId === selectedSession.packageTypeId
																	)
																		return true;
																	return false;
																}) || [];

															const bestPackage =
																matchingPackages[0] || member.packages?.[0];

															return (
																<SelectItem key={member.id} value={member.id}>
																	<div className="flex flex-col">
																		<span className="font-medium">
																			{member.name}
																		</span>
																		<span className="text-xs text-muted-foreground">
																			{bestPackage
																				? `${bestPackage.name} - ${bestPackage.type} (${bestPackage.remaining}/${bestPackage.total} sessions)`
																				: "No packages available"}
																		</span>
																	</div>
																</SelectItem>
															);
														})
												: // Show all members for debugging when no eligible members found
												  members
														.slice(0, 10) // Limit to first 10 for debugging
														.map((member) => (
															<SelectItem
																key={member.id}
																value={member.id}
																disabled>
																<div className="flex flex-col">
																	<span className="font-medium">{member.name}</span>
																	<span className="text-xs text-muted-foreground">
																		{member.packages?.length > 0
																			? `${member.packages
																					.map(
																						(p: any) => `${p.type} (${p.remaining})`
																					)
																					.join(", ")}`
																			: "No packages"}
																	</span>
																</div>
															</SelectItem>
														))}
										</SelectContent>
									</Select>
									<div className="text-sm text-muted-foreground">
										{availableMembers.length === 0 ? (
											<div>
												<p>
													No eligible members found for session type "
													{selectedSession?.packageTypeName}".
												</p>
												<p>Total members: {members.length}</p>
												<p>
													Members with packages:{" "}
													{members.filter((m) => m.packages?.length > 0).length}
												</p>
											</div>
										) : (
											<p>{availableMembers.length} eligible member(s) found.</p>
										)}
									</div>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsBookingDialogOpen(false)}>
									Cancel
								</Button>
								<Button
									onClick={handleConfirmBooking}
									disabled={!selectedMemberId || loading}>
									{loading ? "Booking..." : "Confirm Booking"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Reactivation Dialog */}
					<ReactivationDialog
						isOpen={reactivationDialog.isOpen}
						onClose={() => setReactivationDialog({ isOpen: false, session: null })}
						onConfirm={(data) =>
							reactivationDialog.session &&
							handleReactivateSession(reactivationDialog.session, data)
						}
						sessionTitle={reactivationDialog.session?.title || ""}
						isLoading={loading}
					/>
				</div>
			</div>
		</div>
	);
}
