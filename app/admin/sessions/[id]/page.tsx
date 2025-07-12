"use client";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
	ArrowLeft,
	Calendar,
	Clock,
	User,
	Users,
	MapPin,
	Edit,
	Power,
	PowerOff,
} from "lucide-react";
import { ReactivationDialog } from "@/components/ui/reactivation-dialog";
import { useToast } from "@/hooks/use-toast";
import {
	determineSessionStatus,
	getAvailableActions,
	canDeactivateSession,
	canReactivateSession,
	canEditSession,
	type Session,
} from "@/types/status";

// Enhanced mock session data that matches the calendar data
const mockSessionDetails: Record<string, Session> = {
	"past-1": {
		id: "past-1",
		title: "Group Class – Pilates",
		date: "2023-05-15",
		time: "10:00 AM - 11:00 AM",
		type: "Group Class",
		trainer: "Emma Thompson",
		status: "Completed",
		capacity: { booked: 2, total: 10 },
		bookedMembers: ["John Doe", "Jane Smith"],
		lastModified: "2023-05-15T09:00:00Z",
	},
	"future-1": {
		id: "future-1",
		title: "Group Class – HIIT",
		date: "2025-07-15",
		time: "11:30 AM - 12:30 PM",
		type: "Group Class",
		trainer: "Sarah Williams",
		status: "Available",
		capacity: { booked: 2, total: 10 },
		bookedMembers: ["Michael Brown", "Emily Davis"],
		lastModified: "2025-07-01T10:00:00Z",
	},
	"today-1": {
		id: "today-1",
		title: "Personal Training - Alex Murphy",
		date: new Date().toISOString().split("T")[0],
		time: "2:00 PM - 3:00 PM",
		type: "Personal Training",
		trainer: "Mike Johnson",
		status: "Full",
		capacity: { booked: 1, total: 1 },
		bookedMembers: ["Alex Murphy"],
		lastModified: new Date().toISOString(),
	},
	"inactive-1": {
		id: "inactive-1",
		title: "Group Class - Cancelled Yoga",
		date: "2025-06-20",
		time: "6:00 PM - 7:00 PM",
		type: "Group Class",
		trainer: "Sarah Williams",
		status: "Inactive",
		capacity: { booked: 0, total: 12 },
		bookedMembers: [],
		isManuallyDeactivated: true,
		deactivatedAt: "2025-06-01T10:00:00Z",
		lastModified: "2025-06-01T10:00:00Z",
	},
	"1": {
		id: "1",
		title: "Personal Training - John Doe",
		date: "2025-06-15",
		time: "10:00 AM - 11:00 AM",
		type: "Personal Training",
		trainer: "Mike Johnson",
		status: "Available",
		capacity: { booked: 0, total: 1 },
		bookedMembers: [],
		lastModified: "2025-06-01T10:00:00Z",
	},
	// Legacy session IDs for backward compatibility
	"2": {
		id: "2",
		title: "Group Class - Yoga",
		date: "2025-06-16",
		time: "5:00 PM - 6:00 PM",
		type: "Group Class",
		trainer: "Sarah Williams",
		status: "Available",
		capacity: { booked: 3, total: 12 },
		bookedMembers: ["Emily Davis", "Lisa Johnson", "Sarah Connor"],
		lastModified: "2025-06-01T10:00:00Z",
	},
};

// Mock member details for displaying booking information
const mockMemberDetails: Record<string, any> = {
	"John Doe": {
		id: "1",
		name: "John Doe",
		email: "john.doe@example.com",
		phone: "+1 234 567 890",
		joinDate: "2023-01-15",
	},
	"Jane Smith": {
		id: "2",
		name: "Jane Smith",
		email: "jane.smith@example.com",
		phone: "+1 234 567 891",
		joinDate: "2023-02-20",
	},
	"Michael Brown": {
		id: "3",
		name: "Michael Brown",
		email: "michael.brown@example.com",
		phone: "+1 234 567 892",
		joinDate: "2023-03-10",
	},
	"Emily Davis": {
		id: "4",
		name: "Emily Davis",
		email: "emily.davis@example.com",
		phone: "+1 234 567 893",
		joinDate: "2023-04-05",
	},
	"Alex Murphy": {
		id: "10",
		name: "Alex Murphy",
		email: "alex.murphy@example.com",
		phone: "+1 234 567 899",
		joinDate: "2023-05-01",
	},
	"Lisa Johnson": {
		id: "8",
		name: "Lisa Johnson",
		email: "lisa.johnson@example.com",
		phone: "+1 234 567 898",
		joinDate: "2023-04-15",
	},
	"Sarah Connor": {
		id: "6",
		name: "Sarah Connor",
		email: "sarah.connor@example.com",
		phone: "+1 234 567 896",
		joinDate: "2023-03-20",
	},
};

export default function SessionDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const sessionId = params.id as string;

	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const [reactivationDialog, setReactivationDialog] = useState<{
		isOpen: boolean;
		session: Session | null;
	}>({
		isOpen: false,
		session: null,
	});

	// Load session data
	useEffect(() => {
		loadSessionData();
	}, [sessionId]);

	const loadSessionData = async () => {
		setLoading(true);

		try {
			// Simulate API delay
			await new Promise((resolve) => setTimeout(resolve, 300));

			// First check mock data
			let foundSession = mockSessionDetails[sessionId];

			// If not found in mock data, check localStorage for custom sessions
			if (!foundSession) {
				const storedSessions = JSON.parse(
					localStorage.getItem("gym-calendar-slots") || "[]"
				);
				foundSession = storedSessions.find((s: Session) => s.id === sessionId);
			}

			if (foundSession) {
				// Determine current status based on business rules
				const currentStatus = determineSessionStatus({
					date: foundSession.date,
					capacity: foundSession.capacity,
					isManuallyDeactivated: foundSession.isManuallyDeactivated,
					bookedMembers: foundSession.bookedMembers,
				});

				setSession({
					...foundSession,
					status: currentStatus,
				});
			} else {
				setSession(null);
			}
		} catch (error) {
			console.error("Error loading session:", error);
			setSession(null);
		} finally {
			setLoading(false);
		}
	};

	// Session actions
	const updateSessionInStorage = (updatedSession: Session) => {
		setSession(updatedSession);

		// Update localStorage if it's a custom session
		const storedSessions = JSON.parse(
			localStorage.getItem("gym-calendar-slots") || "[]"
		);
		const updatedSessions = storedSessions.map((s: Session) =>
			s.id === updatedSession.id ? updatedSession : s
		);
		localStorage.setItem("gym-calendar-slots", JSON.stringify(updatedSessions));
	};

	const handleDeactivateSession = async (sessionToDeactivate: Session) => {
		if (!canDeactivateSession(sessionToDeactivate.status)) return;

		setLoading(true);
		await new Promise((r) => setTimeout(r, 1000)); // Simulate API call

		const updatedSession: Session = {
			...sessionToDeactivate,
			isManuallyDeactivated: true,
			deactivatedAt: new Date().toISOString(),
			bookedMembers: [], // Remove all booked members
			capacity: { ...sessionToDeactivate.capacity, booked: 0 },
			status: "Inactive",
			lastModified: new Date().toISOString(),
		};

		updateSessionInStorage(updatedSession);

		// Simulate sending cancellation notifications
		if (
			sessionToDeactivate.bookedMembers &&
			sessionToDeactivate.bookedMembers.length > 0
		) {
			toast({
				title: "Session Deactivated",
				description: `${sessionToDeactivate.bookedMembers.length} members have been notified of the cancellation.`,
			});
		} else {
			toast({
				title: "Session Deactivated",
				description: "The session has been deactivated successfully.",
			});
		}

		setLoading(false);
	};

	const handleReactivateSession = async (
		sessionToReactivate: Session,
		data: { date: string; time: string; notes?: string }
	) => {
		if (!canReactivateSession(sessionToReactivate.status)) return;

		setLoading(true);
		await new Promise((r) => setTimeout(r, 1000)); // Simulate API call

		const updatedSession: Session = {
			...sessionToReactivate,
			date: data.date,
			time: data.time,
			isManuallyDeactivated: false,
			reactivatedAt: new Date().toISOString(),
			status: determineSessionStatus({
				date: data.date,
				capacity: sessionToReactivate.capacity,
				isManuallyDeactivated: false,
				bookedMembers: sessionToReactivate.bookedMembers,
			}),
			lastModified: new Date().toISOString(),
		};

		updateSessionInStorage(updatedSession);

		toast({
			title: "Session Reactivated",
			description: `The session has been reactivated for ${data.date} at ${data.time}.`,
		});

		setReactivationDialog({ isOpen: false, session: null });
		setLoading(false);
	};

	const handleEditSession = (sessionToEdit: Session) => {
		if (!canEditSession(sessionToEdit.status)) return;
		router.push(`/admin/sessions/${sessionToEdit.id}/edit`);
	};

	// Render action buttons based on session status
	const renderActionButtons = (sessionData: Session) => {
		const actions = getAvailableActions(sessionData.status);

		return (
			<div className="flex items-center gap-2 flex-wrap">
				{actions.includes("reactivate") && (
					<Button
						variant="outline"
						onClick={() =>
							setReactivationDialog({ isOpen: true, session: sessionData })
						}
						className="flex items-center gap-2"
						disabled={loading}>
						<Power className="h-4 w-4" />
						Reactivate
					</Button>
				)}

				{actions.includes("edit-details") && (
					<Button
						variant="outline"
						onClick={() => handleEditSession(sessionData)}
						className="flex items-center gap-2"
						disabled={loading}>
						<Edit className="h-4 w-4" />
						Edit Details
					</Button>
				)}

				{actions.includes("deactivate") && (
					<Button
						variant="destructive"
						onClick={() => handleDeactivateSession(sessionData)}
						className="flex items-center gap-2"
						disabled={loading}>
						<PowerOff className="h-4 w-4" />
						Deactivate
					</Button>
				)}
			</div>
		);
	};

	if (loading) {
		return (
			<div className="container mx-auto py-6">
				<div className="text-center">
					<p className="text-muted-foreground">Loading session details...</p>
				</div>
			</div>
		);
	}

	if (!session) {
		return (
			<div className="container mx-auto py-6">
				<div className="text-center space-y-4">
					<h1 className="text-2xl font-bold">Session Not Found</h1>
					<p className="text-muted-foreground">
						The requested session could not be found.
					</p>
					<Button onClick={() => router.back()}>Go Back</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.back()}
						className="mr-2"
						aria-label="Go back">
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<h1 className="text-2xl font-bold">Session Details</h1>
				</div>

				{renderActionButtons(session)}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Session Information */}
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								{session.title}
								<StatusBadge status={session.status} />
							</CardTitle>
							<CardDescription>Session details and information</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="flex items-center space-x-2">
									<User className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm">Trainer: {session.trainer}</span>
								</div>
								<div className="flex items-center space-x-2">
									<Calendar className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm">
										Date:{" "}
										{new Date(session.date).toLocaleDateString("en-US", {
											weekday: "long",
											year: "numeric",
											month: "long",
											day: "numeric",
										})}
									</span>
								</div>
								<div className="flex items-center space-x-2">
									<Clock className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm">Time: {session.time}</span>
								</div>
								<div className="flex items-center space-x-2">
									<MapPin className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm">Type: {session.type}</span>
								</div>
							</div>

							<div className="flex items-center space-x-2">
								<Users className="h-4 w-4 text-muted-foreground" />
								<span className="text-sm">
									Capacity: {session.capacity.booked}/{session.capacity.total}
									{session.capacity.booked >= session.capacity.total &&
										session.status === "Full" && (
											<span className="ml-2 text-orange-600 font-medium">
												Full
											</span>
										)}
								</span>
							</div>

							{/* Session Status Information */}
							<div className="border-t pt-4">
								<h4 className="font-medium mb-2">Status Information</h4>
								<div className="text-sm text-muted-foreground space-y-1">
									{session.status === "Completed" && (
										<p>
											This session has been completed and is read-only for
											reporting purposes.
										</p>
									)}
									{session.status === "Inactive" && session.deactivatedAt && (
										<p>
											Deactivated on:{" "}
											{new Date(session.deactivatedAt).toLocaleDateString(
												"en-US",
												{
													year: "numeric",
													month: "long",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												}
											)}
										</p>
									)}
									{session.status === "Available" && (
										<p>This session is available for booking.</p>
									)}
									{session.status === "Full" && (
										<p>
											This session is fully booked. Increase capacity to allow
											more bookings.
										</p>
									)}
									{session.lastModified && (
										<p>
											Last modified:{" "}
											{new Date(session.lastModified).toLocaleDateString(
												"en-US",
												{
													year: "numeric",
													month: "long",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												}
											)}
										</p>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Booked Members */}
				<div>
					<Card>
						<CardHeader>
							<CardTitle>
								Booked Members ({session.bookedMembers?.length || 0})
							</CardTitle>
							<CardDescription>
								{session.status === "Completed"
									? "Members who attended this session"
									: "Members registered for this session"}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{session.bookedMembers && session.bookedMembers.length > 0 ? (
								<div className="space-y-4">
									{session.bookedMembers.map((memberName, index) => {
										const memberDetails = mockMemberDetails[memberName];
										return (
											<div key={index} className="border rounded-lg p-3">
												<h4 className="font-medium">{memberName}</h4>
												{memberDetails && (
													<>
														<p className="text-sm text-muted-foreground">
															{memberDetails.email}
														</p>
														<p className="text-sm text-muted-foreground">
															{memberDetails.phone}
														</p>
														<p className="text-xs text-muted-foreground mt-1">
															Member since: {memberDetails.joinDate}
														</p>
													</>
												)}
											</div>
										);
									})}
								</div>
							) : (
								<div className="text-center py-4">
									<p className="text-muted-foreground">
										{session.status === "Inactive"
											? "No members (removed upon deactivation)"
											: "No members booked yet"}
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

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
	);
}
