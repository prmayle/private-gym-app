"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
	ArrowLeft,
	Save,
	AlertTriangle,
	Calendar,
	Clock,
	User,
	Users,
} from "lucide-react";

// Session interface
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
	isManuallyDeactivated?: boolean;
	deactivatedAt?: string;
	reactivatedAt?: string;
	lastModified?: string;
	description?: string;
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

	if (isManuallyDeactivated) return "Inactive";
	if (sessionDate < today && bookedMembers && bookedMembers.length > 0)
		return "Completed";
	if (sessionDate >= today && capacity.booked >= capacity.total) return "Full";
	return "Available";
};

const canEditSession = (status: Session["status"]): boolean => {
	return status === "Available" || status === "Full";
};

// Mock trainers and session types
const trainers = [
	{ id: "1", name: "Mike Johnson" },
	{ id: "2", name: "Sarah Williams" },
	{ id: "3", name: "David Lee" },
	{ id: "4", name: "Emma Thompson" },
	{ id: "5", name: "Lisa Johnson" },
];

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

// Mock session details
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
		description: "Relaxing pilates session for core strength",
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
		description: "High-intensity interval training",
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
		description: "One-on-one strength training session",
	},
};

export default function EditSessionPage() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const sessionId = params.id as string;

	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [formData, setFormData] = useState({
		title: "",
		date: "",
		time: "",
		type: "",
		trainer: "",
		capacity: 1,
		description: "",
	});

	useEffect(() => {
		loadSession();
	}, [sessionId]);

	const loadSession = async () => {
		setLoading(true);
		try {
			// First check mock data
			let foundSession = mockSessionDetails[sessionId];

			// If not found in mock data, check localStorage
			if (!foundSession) {
				const storedSessions = JSON.parse(
					localStorage.getItem("gym-calendar-slots") || "[]"
				);
				foundSession = storedSessions.find((s: Session) => s.id === sessionId);
			}

			if (foundSession) {
				// Determine current status
				const currentStatus = determineSessionStatus({
					date: foundSession.date,
					capacity: foundSession.capacity,
					isManuallyDeactivated: foundSession.isManuallyDeactivated,
					bookedMembers: foundSession.bookedMembers,
				});

				const sessionWithStatus = { ...foundSession, status: currentStatus };
				setSession(sessionWithStatus);

				// Populate form
				setFormData({
					title: foundSession.title,
					date: foundSession.date,
					time: foundSession.time,
					type: foundSession.type,
					trainer: foundSession.trainer,
					capacity: foundSession.capacity.total,
					description: foundSession.description || "",
				});
			} else {
				toast({
					title: "Session Not Found",
					description: "The requested session could not be found.",
					variant: "destructive",
				});
				router.push("/admin/sessions");
			}
		} catch (error) {
			console.error("Error loading session:", error);
			toast({
				title: "Error",
				description: "Failed to load session details",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!session) return;

		// Check if session can be edited
		if (!canEditSession(session.status)) {
			toast({
				title: "Cannot Edit Session",
				description: `Sessions with status "${session.status}" cannot be edited.`,
				variant: "destructive",
			});
			return;
		}

		// Validate form
		if (
			!formData.title ||
			!formData.date ||
			!formData.time ||
			!formData.type ||
			!formData.trainer
		) {
			toast({
				title: "Validation Error",
				description: "Please fill in all required fields",
				variant: "destructive",
			});
			return;
		}

		// Validate capacity doesn't go below current bookings
		if (formData.capacity < session.capacity.booked) {
			toast({
				title: "Invalid Capacity",
				description: `Capacity cannot be less than current bookings (${session.capacity.booked})`,
				variant: "destructive",
			});
			return;
		}

		setSaving(true);
		try {
			const updatedSession: Session = {
				...session,
				title: formData.title,
				date: formData.date,
				time: formData.time,
				type: formData.type,
				trainer: formData.trainer,
				capacity: { ...session.capacity, total: formData.capacity },
				description: formData.description,
				lastModified: new Date().toISOString(),
			};

			// Determine new status based on updated data
			updatedSession.status = determineSessionStatus({
				date: updatedSession.date,
				capacity: updatedSession.capacity,
				isManuallyDeactivated: updatedSession.isManuallyDeactivated,
				bookedMembers: updatedSession.bookedMembers,
			});

			// Update localStorage
			const storedSessions = JSON.parse(
				localStorage.getItem("gym-calendar-slots") || "[]"
			);
			const sessionIndex = storedSessions.findIndex(
				(s: Session) => s.id === sessionId
			);

			if (sessionIndex !== -1) {
				storedSessions[sessionIndex] = updatedSession;
			} else {
				// This might be a mock session, add it to localStorage
				storedSessions.push(updatedSession);
			}

			localStorage.setItem(
				"gym-calendar-slots",
				JSON.stringify(storedSessions)
			);

			// Log activity
			const activities = JSON.parse(
				localStorage.getItem("admin-activities") || "[]"
			);
			activities.unshift({
				id: `activity-${Date.now()}`,
				type: "session_updated",
				message: "Session updated",
				details: `${updatedSession.title} session details updated`,
				timestamp: new Date().toISOString(),
				category: "sessions",
				sessionId: updatedSession.id,
				sessionTitle: updatedSession.title,
			});
			localStorage.setItem("admin-activities", JSON.stringify(activities));

			toast({
				title: "Session Updated",
				description: "The session has been successfully updated.",
			});

			// Navigate back to sessions list
			router.push("/admin/sessions");
		} catch (error) {
			console.error("Error saving session:", error);
			toast({
				title: "Error",
				description: "Failed to save session changes",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const formatTime = (time24: string) => {
		if (!time24) return "";
		const [hours, minutes] = time24.split(":");
		const hour = Number.parseInt(hours);
		const ampm = hour >= 12 ? "PM" : "AM";
		const hour12 = hour % 12 || 12;
		return `${hour12}:${minutes} ${ampm}`;
	};

	if (loading) {
		return (
			<div className="container mx-auto py-6">
				<div className="space-y-6">
					<div className="flex items-center space-x-4">
						<div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
						<div className="space-y-2">
							<div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
							<div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
						</div>
					</div>
					<div className="h-96 bg-gray-200 rounded animate-pulse" />
				</div>
			</div>
		);
	}

	if (!session) {
		return (
			<div className="container mx-auto py-6">
				<div className="text-center py-12">
					<h2 className="text-2xl font-bold mb-4">Session Not Found</h2>
					<p className="text-muted-foreground mb-6">
						The requested session could not be found.
					</p>
					<Button onClick={() => router.push("/admin/sessions")}>
						Back to Sessions
					</Button>
				</div>
			</div>
		);
	}

	const isCompleted = session.status === "Completed";
	const hasBookings = session.bookedMembers && session.bookedMembers.length > 0;

	return (
		<div className="container mx-auto py-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-4">
					<Button
						variant="outline"
						size="icon"
						onClick={() => router.push("/admin/sessions")}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-3xl font-bold">Edit Session</h1>
						<p className="text-muted-foreground">
							Modify session details and settings
						</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					<Badge variant={isCompleted ? "secondary" : "default"}>
						{session.status}
					</Badge>
					<Button
						onClick={handleSave}
						disabled={saving || isCompleted}
						className="flex items-center gap-2">
						<Save className="h-4 w-4" />
						{saving ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</div>

			{/* Warning for completed sessions */}
			{isCompleted && (
				<Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
					<CardContent className="pt-6">
						<div className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
							<AlertTriangle className="h-5 w-5" />
							<p className="font-medium">
								This session has been completed and cannot be edited.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Warning for sessions with bookings */}
			{hasBookings && !isCompleted && (
				<Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
					<CardContent className="pt-6">
						<div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
							<AlertTriangle className="h-5 w-5" />
							<div>
								<p className="font-medium">
									This session has {session.bookedMembers?.length} booking(s).
								</p>
								<p className="text-sm">
									Changes may affect booked members. Consider sending
									notifications.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Form */}
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Session Details</CardTitle>
							<CardDescription>
								Basic information about the session
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="title">Session Title *</Label>
									<Input
										id="title"
										value={formData.title}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												title: e.target.value,
											}))
										}
										disabled={isCompleted}
										placeholder="Enter session title"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="sessionType">Session Type</Label>
									<Select
										value={formData.type}
										onValueChange={(value) =>
											setFormData((prev) => ({ ...prev, type: value }))
										}
										disabled={isCompleted}>
										<SelectTrigger>
											<SelectValue placeholder="Select session type" />
										</SelectTrigger>
										<SelectContent>
											{sessionTypes.map((type) => (
												<SelectItem key={type} value={type}>
													{type}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="date">Date *</Label>
									<Input
										id="date"
										type="date"
										value={formData.date}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, date: e.target.value }))
										}
										disabled={isCompleted}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="time">Time *</Label>
									<Input
										id="time"
										value={formData.time}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, time: e.target.value }))
										}
										disabled={isCompleted}
										placeholder="e.g., 10:00 AM - 11:00 AM"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="trainer">Trainer *</Label>
									<Select
										value={formData.trainer}
										onValueChange={(value) =>
											setFormData((prev) => ({ ...prev, trainer: value }))
										}
										disabled={isCompleted}>
										<SelectTrigger>
											<SelectValue placeholder="Select trainer" />
										</SelectTrigger>
										<SelectContent>
											{trainers.map((trainer) => (
												<SelectItem key={trainer.id} value={trainer.name}>
													{trainer.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="capacity">
										Capacity *
										{session.capacity.booked > 0 && (
											<span className="text-sm text-muted-foreground ml-2">
												(Currently {session.capacity.booked} booked - cannot go
												below this number)
											</span>
										)}
									</Label>
									<Input
										id="capacity"
										type="number"
										min={session.capacity.booked}
										max="50"
										value={formData.capacity}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												capacity: Number.parseInt(e.target.value) || 1,
											}))
										}
										disabled={isCompleted}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">Description (Optional)</Label>
								<Textarea
									id="description"
									value={formData.description}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											description: e.target.value,
										}))
									}
									disabled={isCompleted}
									placeholder="Additional notes about the session..."
									rows={3}
								/>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Session Info */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center space-x-2">
								<Calendar className="h-5 w-5" />
								<span>Session Info</span>
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center space-x-2 text-sm">
								<Calendar className="h-4 w-4 text-muted-foreground" />
								<span>
									{formData.date
										? new Date(formData.date).toLocaleDateString()
										: "No date set"}
								</span>
							</div>
							<div className="flex items-center space-x-2 text-sm">
								<Clock className="h-4 w-4 text-muted-foreground" />
								<span>{formData.time || "No time set"}</span>
							</div>
							<div className="flex items-center space-x-2 text-sm">
								<User className="h-4 w-4 text-muted-foreground" />
								<span>{formData.trainer || "No trainer assigned"}</span>
							</div>
							<div className="flex items-center space-x-2 text-sm">
								<Users className="h-4 w-4 text-muted-foreground" />
								<span>
									{session.capacity.booked} / {formData.capacity} booked
								</span>
							</div>
						</CardContent>
					</Card>

					{/* Current Bookings */}
					{hasBookings && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Users className="h-5 w-5" />
									<span>Current Bookings</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									{session.bookedMembers?.map((memberName, index) => (
										<div
											key={index}
											className="flex items-center justify-between text-sm">
											<span>{memberName}</span>
											<span className="text-muted-foreground">Booked</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Session History */}
					<Card>
						<CardHeader>
							<CardTitle>Session History</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2 text-sm">
								<div>
									<span className="text-muted-foreground">Status:</span>{" "}
									{session.status}
								</div>
								{session.lastModified && (
									<div>
										<span className="text-muted-foreground">
											Last Modified:
										</span>{" "}
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
									</div>
								)}
								{session.deactivatedAt && (
									<div>
										<span className="text-muted-foreground">Deactivated:</span>{" "}
										{new Date(session.deactivatedAt).toLocaleDateString(
											"en-US",
											{
												year: "numeric",
												month: "long",
												day: "numeric",
											}
										)}
									</div>
								)}
								{session.reactivatedAt && (
									<div>
										<span className="text-muted-foreground">Reactivated:</span>{" "}
										{new Date(session.reactivatedAt).toLocaleDateString(
											"en-US",
											{
												year: "numeric",
												month: "long",
												day: "numeric",
											}
										)}
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
