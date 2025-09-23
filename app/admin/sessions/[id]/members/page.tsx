"use client";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Member and Profile interfaces based on DB schema
interface Member {
	id: string;
	user_id: string;
	emergency_contact?: string | null;
	medical_conditions?: string | null;
	date_of_birth?: string | null;
	gender?: string | null;
	address?: string | null;
	height?: number | null;
	weight?: number | null;
	profile_photo_url?: string | null;
	joined_at?: string | null;
	membership_status?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
	member_number?: string | null;
	fitness_goals?: string | null;
	profile?: Profile;
	booking?: Booking;
}

interface Booking {
	id: string;
	status: "confirmed" | "pending" | "cancelled" | "attended";
	booking_time: string;
	attended: boolean;
	attendance_time?: string | null;
	check_in_time?: string | null;
	check_out_time?: string | null;
	rating?: number | null;
	feedback?: string | null;
	notes?: string | null;
}

interface Profile {
	id: string;
	email: string;
	full_name?: string | null;
	phone?: string | null;
	role?: string | null;
	avatar_url?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
	is_active?: boolean | null;
	last_login_at?: string | null;
	timezone?: string | null;
}

// Config for table columns
const memberTableConfig: Array<{
	key: keyof Member | `profile.${keyof Profile}` | `booking.${keyof Booking}`;
	label: string;
	render?: (value: any, row: Member) => React.ReactNode;
}> = [
	{ key: "profile.full_name", label: "Name" },
	{ key: "profile.email", label: "Email" },
	{ key: "profile.phone", label: "Phone" },
	{
		key: "booking.status",
		label: "Booking Status",
		render: (v) => (
			<Badge
				variant={
					v === "confirmed"
						? "default"
						: v === "attended"
						? "default"
						: v === "pending"
						? "secondary"
						: "destructive"
				}>
				{v}
			</Badge>
		),
	},
	{
		key: "booking.booking_time",
		label: "Booked At",
		render: (v) => (v ? new Date(v).toLocaleString() : "-"),
	},
	{
		key: "booking.attended",
		label: "Attended",
		render: (v) => (v ? "Yes" : "No"),
	},
	{
		key: "membership_status",
		label: "Membership Status",
		render: (v) => (
			<Badge variant={v === "active" ? "default" : "secondary"}>{v}</Badge>
		),
	},
];

export default function SessionMembersPage() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const sessionId = params.id as string;
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch real members data for the session
	useEffect(() => {
		const fetchSessionMembers = async () => {
			setLoading(true);
			setError(null);

			try {
				const supabase = createClient();

				// Fetch bookings for this session with member and profile data
				const { data: bookingsData, error: bookingsError } = await supabase
					.from("bookings")
					.select(
						`
						id,
						status,
						booking_time,
						attended,
						attendance_time,
						check_in_time,
						check_out_time,
						rating,
						feedback,
						notes,
						member:member_id (
							id,
							user_id,
							membership_status,
							joined_at,
							profile:user_id (
								id,
								email,
								full_name,
								phone
							)
						)
					`
					)
					.eq("session_id", sessionId)
					.order("booking_time", { ascending: false });

				if (bookingsError) {
					console.error("Error fetching bookings:", bookingsError);
					setError("Failed to load session members");
					toast({
						title: "Error",
						description: "Failed to load session members",
						variant: "destructive",
					});
				} else {
					// Transform the data to match our interface
					const transformedMembers: Member[] = (bookingsData || []).map(
						(booking: any) => ({
							...booking.member,
							booking: {
								id: booking.id,
								status: booking.status,
								booking_time: booking.booking_time,
								attended: booking.attended,
								attendance_time: booking.attendance_time,
								check_in_time: booking.check_in_time,
								check_out_time: booking.check_out_time,
								rating: booking.rating,
								feedback: booking.feedback,
								notes: booking.notes,
							},
						})
					);

					setMembers(transformedMembers);
				}
			} catch (error) {
				console.error("Error fetching session members:", error);
				setError("Failed to load session members");
				toast({
					title: "Error",
					description: "Failed to load session members",
					variant: "destructive",
				});
			} finally {
				setLoading(false);
			}
		};

		if (sessionId) {
			fetchSessionMembers();
		}
	}, [sessionId, toast]);

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.back()}
					className="mr-2"
					aria-label="Go back">
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<h1 className="text-2xl font-bold">Session Members</h1>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>Session Members</CardTitle>
					<CardDescription>
						All members who have booked this session
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="text-center py-8">Loading members...</div>
					) : error ? (
						<div className="text-center py-8">
							<p className="text-destructive">{error}</p>
							<Button
								variant="outline"
								onClick={() => window.location.reload()}
								className="mt-2">
								Retry
							</Button>
						</div>
					) : members.length > 0 ? (
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										{memberTableConfig.map((col) => (
											<TableHead key={col.key}>{col.label}</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{members.map((member, idx) => (
										<TableRow key={member.id}>
											{memberTableConfig.map((col) => {
												let value;
												if (col.key.startsWith("profile.")) {
													const profileKey = col.key.replace(
														"profile.",
														""
													) as keyof Profile;
													value = member.profile
														? member.profile[profileKey]
														: undefined;
												} else if (col.key.startsWith("booking.")) {
													const bookingKey = col.key.replace(
														"booking.",
														""
													) as keyof Booking;
													value = member.booking
														? member.booking[bookingKey]
														: undefined;
												} else {
													value = member[col.key as keyof Member];
												}
												return (
													<TableCell key={col.key}>
														{col.render
															? col.render(value, member)
															: value != null
															? String(value)
															: "-"}
													</TableCell>
												);
											})}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : (
						<div className="text-center py-8">
							<p className="text-muted-foreground">
								No members have booked this session yet.
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
