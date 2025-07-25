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
	waiver_signed?: boolean | null;
	waiver_signed_date?: string | null;
	profile?: Profile;
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
	key: keyof Member | `profile.${keyof Profile}`;
	label: string;
	render?: (value: any, row: Member) => React.ReactNode;
}> = [
	{ key: "profile.full_name", label: "Name" },
	{ key: "profile.email", label: "Email" },
	{ key: "profile.phone", label: "Phone" },
	{
		key: "membership_status",
		label: "Membership Status",
		render: (v) => (
			<Badge variant={v === "active" ? "default" : "secondary"}>{v}</Badge>
		),
	},
	{
		key: "joined_at",
		label: "Joined At",
		render: (v) => (v ? new Date(v).toLocaleDateString() : "-"),
	},
	{
		key: "waiver_signed",
		label: "Waiver Signed",
		render: (v) => (v ? "Yes" : "No"),
	},
];

export default function SessionMembersPage() {
	const router = useRouter();
	const params = useParams();
	const sessionId = params.id as string;
	const [members, setMembers] = useState<Member[]>([]);
	const [loading, setLoading] = useState(true);

	// Simulate fetching members for the session
	useEffect(() => {
		setLoading(true);
		setTimeout(() => {
			setMembers([
				{
					id: "1",
					user_id: "u1",
					membership_status: "active",
					joined_at: new Date(Date.now() - 86400000 * 100).toISOString(),
					waiver_signed: true,
					profile: {
						id: "u1",
						email: "john.doe@example.com",
						full_name: "John Doe",
						phone: "+1 234 567 890",
					},
				},
				{
					id: "2",
					user_id: "u2",
					membership_status: "inactive",
					joined_at: new Date(Date.now() - 86400000 * 200).toISOString(),
					waiver_signed: false,
					profile: {
						id: "u2",
						email: "jane.smith@example.com",
						full_name: "Jane Smith",
						phone: "+1 234 567 891",
					},
				},
			]);
			setLoading(false);
		}, 500);
	}, [sessionId]);

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
					<CardTitle>Members List</CardTitle>
					<CardDescription>
						All members registered for this session (schema-driven)
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="text-center py-8">Loading members...</div>
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
								No members registered for this session yet.
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
