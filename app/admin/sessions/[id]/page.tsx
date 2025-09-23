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
import { ArrowLeft, Save, X, Pencil, Users, Calendar } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Session as DbSession } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCallback } from "react";
import { PageHeader } from "@/components/page-header";

export interface Session extends DbSession {
	package?: {
		id: string;
		name: string;
		package_type?: {
			id: string;
			name: string;
		};
	};
}

interface Trainer {
	id: string;
	name: string;
}

const sessionFieldConfig: Array<{
	key: keyof Session | "package" | "package_type";
	label: string;
	type:
		| "text"
		| "textarea"
		| "number"
		| "datetime-local"
		| "boolean"
		| "array"
		| "package"
		| "package_type"
		| "trainer";
	render?: (value: any) => React.ReactNode;
	editable?: boolean;
	placeholder?: string;
	helpText?: string;
}> = [
	{
		key: "title",
		label: "Title",
		type: "text",
		editable: true,
		placeholder: "Session title",
	},
	{
		key: "description",
		label: "Description",
		type: "textarea",
		editable: true,
		placeholder: "Describe the session",
	},
	{
		key: "package",
		label: "Package",
		type: "package",
		editable: true,
		placeholder: "Select package",
	},
	{
		key: "package_type",
		label: "Package Type",
		type: "package_type",
		editable: false,
	},
	{
		key: "trainer_id",
		label: "Trainer",
		type: "trainer",
		editable: true,
		placeholder: "Select trainer",
	},
	{
		key: "max_capacity",
		label: "Max Capacity",
		type: "number",
		editable: true,
		placeholder: "e.g. 10",
	},
	{ key: "current_bookings", label: "Current Bookings", type: "number" },
	{
		key: "start_time",
		label: "Start Time",
		type: "datetime-local",
		render: (v) => (v ? new Date(v).toLocaleString() : "-"),
		editable: true,
		helpText: "When the session starts",
	},
	{
		key: "end_time",
		label: "End Time",
		type: "datetime-local",
		render: (v) => (v ? new Date(v).toLocaleString() : "-"),
		editable: true,
		helpText: "When the session ends",
	},
	{
		key: "status",
		label: "Status",
		type: "text",
		render: (v) => (v ? <StatusBadge status={v} /> : "-"),
	},

	{
		key: "location",
		label: "Location",
		type: "text",
		editable: true,
		placeholder: "e.g. Studio A",
	},
	{
		key: "equipment_needed",
		label: "Equipment Needed",
		type: "array",
		render: (v) => (Array.isArray(v) ? v.join(", ") : "-"),
		editable: true,
		placeholder: "Comma separated (e.g. Yoga Mat, Water Bottle)",
	},
];

// Helper to format date for datetime-local input
function formatDateTimeLocal(dateString?: string) {
	if (!dateString) return "";
	const d = new Date(dateString);
	// Pad with zeros
	const pad = (n: number) => n.toString().padStart(2, "0");
	const yyyy = d.getFullYear();
	const mm = pad(d.getMonth() + 1);
	const dd = pad(d.getDate());
	const hh = pad(d.getHours());
	const min = pad(d.getMinutes());
	return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function SessionDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const { toast } = useToast();
	const sessionId = params.id as string;

	const [session, setSession] = useState<Session | null>(null);
	const [formData, setFormData] = useState<
		Partial<Session & { package_id: string }>
	>({});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editMode, setEditMode] = useState(false);
	const [packages, setPackages] = useState<any[]>([]); // [{id, name, package_type: {id, name}}]
	const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
	const [trainers, setTrainers] = useState<Trainer[]>([]);

	useEffect(() => {
		const fetchSessionAndPackagesAndTrainers = async () => {
			setLoading(true);
			setError(null);
			const supabase = createClient();
			// Fetch session with package and package_type
			const { data: sessionData, error: sessionError } = await supabase
				.from("sessions")
				.select(
					`*, package_type:package_type_id (id, name)`
				)
				.eq("id", sessionId)
				.single();
			if (sessionError) {
				setError("Session not found or failed to load.");
				setSession(null);
			} else {
				setSession(sessionData as Session);
				setFormData(sessionData as Session);
				setSelectedPackage(sessionData.package);
			}
			// Fetch all packages with their types
			const { data: packagesData } = await supabase
				.from("packages")
				.select("id, name, package_type:package_type_id (id, name)");
			setPackages(packagesData || []);
			// Fetch all trainers (id, name)
			const { data: trainersData } = await supabase
				.from("trainers")
				.select("id, profiles!trainers_user_id_fkey(full_name)");
			setTrainers(
				(trainersData || []).map((t: any) => ({
					id: t.id,
					name: t.profiles?.full_name || "Unknown Trainer",
				}))
			);
			setLoading(false);
		};
		if (sessionId) fetchSessionAndPackagesAndTrainers();
	}, [sessionId]);

	const handleChange = (key: keyof Session | "package_id", value: any) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
		if (key === "package_id") {
			const pkg = packages.find((p) => p.id === value);
			setSelectedPackage(pkg);
		}
	};

	const handleSave = async () => {
		if (!session) return;
		setSaving(true);
		const supabase = createClient();
		// Only send valid columns for update
		const allowedFields = [
			"title",
			"description",
			"trainer_id",
			"max_capacity",
			"start_time",
			"end_time",
			"status",
			"location",
			"equipment_needed",
			"current_bookings",
			"package_id",
		];
		const updateData: any = {};
		for (const key of allowedFields) {
			if ((formData as any)[key] !== undefined)
				updateData[key] = (formData as any)[key];
		}
		console.log(updateData);
		const { error } = await supabase
			.from("sessions")
			.update(updateData)
			.eq("id", session.id);
		if (error) {
			toast({
				title: "Error",
				description: "Failed to update session.",
				variant: "destructive",
			});
		} else {
			toast({
				title: "Session Updated",
				description: "Session updated successfully.",
			});
			setSession({ ...session, ...formData } as Session);
			setEditMode(false);
		}
		setSaving(false);
	};

	if (loading) {
		return (
			<div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[40vh]">
				<div className="animate-pulse text-lg text-muted-foreground">
					Loading session details...
				</div>
			</div>
		);
	}

	if (error || !session) {
		return (
			<div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[40vh]">
				<h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
				<p className="text-muted-foreground mb-6">
					{error || "The requested session could not be found."}
				</p>
				<Button onClick={() => router.push("/admin/sessions")}>
					Back to Sessions
				</Button>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 max-w-3xl">
			<PageHeader title="Session Details" subtitle="Manage session details" icon={Calendar} />
			<div className="flex items-center gap-4 mb-6">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push("/admin/sessions")}
					className="mr-2"
					aria-label="Back to sessions">
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
					Session Details
					{session.status && (
						<StatusBadge status={session.status} className="ml-2" />
					)}
				</h1>
			</div>
			<Card className="shadow-lg border-2 border-muted bg-background/80">
				<CardHeader className="pb-2 border-b flex flex-col md:flex-row md:items-center md:justify-between">
					<div>
						<CardTitle className="flex items-center gap-3 text-2xl">
							{editMode ? (
								<Input
									disabled={saving}
									value={formData.title as string}
									onChange={(e) => handleChange("title", e.target.value)}
									className="text-2xl font-bold"
								/>
							) : (
								<>{session.title}</>
							)}
							{session.status && <StatusBadge status={session.status} />}
						</CardTitle>
						<CardDescription className="text-base text-muted-foreground mt-1">
							{editMode ? (
								<Textarea
									disabled={saving}
									value={formData.description as string}
									onChange={(e) => handleChange("description", e.target.value)}
									rows={2}
								/>
							) : (
								session.description || "No description provided."
							)}
						</CardDescription>
					</div>
					<div className="flex gap-2 mt-4 md:mt-0">
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								router.push(`/admin/sessions/${sessionId}/members`)
							}
							className="flex items-center gap-2">
							<Users className="h-4 w-4" />
							View Members
						</Button>
						{editMode ? (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setEditMode(false);
										setFormData(session);
									}}
									disabled={saving}>
									<X className="h-4 w-4 mr-1" /> Cancel
								</Button>
								<Button
									onClick={handleSave}
									size="sm"
									disabled={saving}
									className="flex items-center gap-2">
									<Save className="h-4 w-4" />
									{saving ? "Saving..." : "Save Changes"}
								</Button>
							</>
						) : (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setEditMode(true)}>
								<Pencil className="h-4 w-4 mr-1" /> Edit Session
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="py-6 px-4 md:px-8">
					<div className="mb-6">
						<h2 className="text-lg font-semibold mb-2">Session Information</h2>
						<p className="text-muted-foreground text-sm mb-4">
							Edit the fields below and click Save Changes to update the
							session. Fields are pre-filled with current data.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{sessionFieldConfig.map(
							({
								key,
								label,
								type,
								render,
								editable,
								placeholder,
								helpText,
							}) => {
								if (key === "title" || key === "description") return null; // handled above
								let value;
								if (key === "package") {
									if (editMode) {
										value =
											formData.package_id ||
											selectedPackage?.id ||
											session.package?.id;
									} else {
										value = selectedPackage?.name || session.package?.name;
									}
								} else if (key === "package_type") {
									value =
										selectedPackage?.package_type?.name ||
										session.package?.package_type?.name;
								} else if (key === "trainer_id") {
									if (editMode) {
										value = formData.trainer_id;
									} else {
										// Find trainer name by ID
										const trainer = trainers.find(
											(t) => t.id === session.trainer_id
										);
										value = trainer ? trainer.name : session.trainer_id || "-";
									}
								} else {
									value = editMode
										? formData[key as keyof Session]
										: session[key as keyof Session];
								}
								return (
									<div
										key={key}
										className="flex flex-col gap-1 border-b pb-3 mb-2 group">
										<span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
											{label}
										</span>
										{editMode && editable && type === "package" ? (
											<Select
												value={value}
												onValueChange={(val) =>
													handleChange("package_id", val)
												}>
												<SelectTrigger>
													<SelectValue placeholder="Select package" />
												</SelectTrigger>
												<SelectContent>
													{packages.map((pkg) => (
														<SelectItem key={pkg.id} value={pkg.id}>
															{pkg.name} ({pkg.package_type?.name || "No type"})
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : editMode && editable && type === "trainer" ? (
											<Select
												value={value || ""}
												onValueChange={(val) =>
													handleChange("trainer_id", val)
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
										) : editMode &&
										  editable &&
										  (key === "start_time" || key === "end_time") &&
										  type === "datetime-local" ? (
											<Input
												disabled={saving}
												type="datetime-local"
												value={formatDateTimeLocal(value)}
												onChange={(e) =>
													handleChange(key as keyof Session, e.target.value)
												}
												placeholder={placeholder}
												className="rounded border focus:ring-2 focus:ring-primary/50 transition-all"
											/>
										) : type === "package_type" ? (
											<span className="text-base font-medium">
												{value || "-"}
											</span>
										) : editMode && editable ? (
											type === "textarea" ? (
												<Textarea
													disabled={saving}
													value={
														typeof value === "string"
															? value
															: value == null
															? ""
															: String(value)
													}
													onChange={(e) =>
														handleChange(key as keyof Session, e.target.value)
													}
													rows={2}
													placeholder={placeholder}
													className="rounded border focus:ring-2 focus:ring-primary/50 transition-all"
												/>
											) : type === "array" ? (
												<Input
													disabled={saving}
													value={
														Array.isArray(value)
															? value.join(", ")
															: typeof value === "string"
															? value
															: value == null
															? ""
															: String(value)
													}
													onChange={(e) =>
														handleChange(
															key as keyof Session,
															e.target.value
																.split(",")
																.map((s: string) => s.trim())
																.filter(Boolean)
														)
													}
													placeholder={placeholder}
													className="rounded border focus:ring-2 focus:ring-primary/50 transition-all"
												/>
											) : type === "boolean" ? (
												<div className="flex items-center gap-2 mt-1">
													<Switch
														checked={!!value}
														disabled={saving}
														onCheckedChange={(v) =>
															handleChange(key as keyof Session, v)
														}
													/>
													<span className="text-sm text-muted-foreground">
														{helpText}
													</span>
												</div>
											) : (
												<Input
													disabled={saving}
													type={
														type === "number"
															? "number"
															: type === "datetime-local"
															? "datetime-local"
															: "text"
													}
													value={
														typeof value === "string" ||
														typeof value === "number"
															? value
															: value == null
															? ""
															: String(value)
													}
													onChange={(e) =>
														handleChange(key as keyof Session, e.target.value)
													}
													placeholder={placeholder}
													className="rounded border focus:ring-2 focus:ring-primary/50 transition-all"
												/>
											)
										) : render ? (
											render(session[key as keyof Session])
										) : value != null && value !== "" ? (
											<span className="text-base font-medium">
												{String(value)}
											</span>
										) : (
											<span className="text-base font-medium">-</span>
										)}
										{helpText && (
											<span className="text-xs text-muted-foreground mt-1">
												{helpText}
											</span>
										)}
									</div>
								);
							}
						)}
					</div>
				</CardContent>
				<div className="px-4 md:px-8 pb-4 pt-2 flex flex-col md:flex-row md:items-center md:justify-between border-t bg-muted/30 rounded-b-lg">
					<div className="text-xs text-muted-foreground">
						Created:{" "}
						{session.created_at
							? new Date(session.created_at).toLocaleString()
							: "-"}
						<br />
						Last Updated:{" "}
						{session.updated_at
							? new Date(session.updated_at).toLocaleString()
							: "-"}
					</div>
				</div>
			</Card>
		</div>
	);
}
