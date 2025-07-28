"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	ArrowLeft,
	Bell,
	ChevronLeft,
	ChevronRight,
	Plus,
	Search,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Notification, UserProfile } from "@/lib/supabase";

export default function NotificationsPage() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [notifications, setNotifications] = useState<
		(Notification & { profiles?: UserProfile })[]
	>([]);
	const itemsPerPage = 10;

	useEffect(() => {
		const fetchNotifications = async () => {
			const supabase = createClient();
			const { data, error } = await supabase
				.from("notifications")
				.select("*, profiles:user_id (id, full_name, email)")
				.order("created_at", { ascending: false });
			if (!error && data) {
				setNotifications(data);
			}
		};
		fetchNotifications();
	}, []);

	// Filter notifications based on search query and type filter
	const filteredNotifications = notifications.filter(
		(notification) =>
			(notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				notification.message
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				notification.profiles?.full_name
					?.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				"" ||
				notification.profiles?.email
					?.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				"") &&
			(typeFilter === "all" ||
				notification.type.toLowerCase() === typeFilter.toLowerCase())
	);

	// Calculate pagination
	const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedNotifications = filteredNotifications.slice(
		startIndex,
		startIndex + itemsPerPage
	);

	return (
		<div className="container mx-auto max-w-7xl py-6 space-y-6">
			{/* Header */}
			<div className="relative mb-8">
				<div className="absolute inset-0 h-32 bg-gradient-to-br from-blue-900/60 to-gray-900/80 rounded-2xl blur-lg -z-10" />
				<div className="flex items-center justify-between gap-6 p-6 rounded-2xl shadow-xl bg-background/80 dark:bg-background/60 backdrop-blur border border-border">
					<div className="flex items-center gap-6">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => router.back()}
							className="mr-2"
							aria-label="Go back">
							<ArrowLeft className="h-5 w-5" />
						</Button>
						<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold border-4 border-primary shadow-lg">
							<Bell className="w-10 h-10 text-primary" />
						</div>
						<div>
							<div className="font-bold text-2xl flex items-center gap-2">
								Notifications
							</div>
							<div className="text-muted-foreground text-sm">
								Manage and send notifications to members
							</div>
						</div>
					</div>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Notification Management</CardTitle>
					<CardDescription>
						View and manage all notifications sent to members
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
						<div className="flex items-center space-x-2">
							<Search className="h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search notifications..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="max-w-sm"
							/>
						</div>
						<div className="flex space-x-2">
							<Select value={typeFilter} onValueChange={setTypeFilter}>
								<SelectTrigger className="w-[180px]">
									<SelectValue placeholder="Filter by type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Types</SelectItem>
									<SelectItem value="session reminder">
										Session Reminder
									</SelectItem>
									<SelectItem value="announcement">Announcement</SelectItem>
									<SelectItem value="package expiry">Package Expiry</SelectItem>
									<SelectItem value="payment reminder">
										Payment Reminder
									</SelectItem>
									<SelectItem value="custom">Custom</SelectItem>
								</SelectContent>
							</Select>
							<Button asChild>
								<Link href="/admin/notifications/templates">
									<Bell className="mr-2 h-4 w-4" />
									Templates
								</Link>
							</Button>
							<Button asChild>
								<Link href="/admin/notifications/new">
									<Plus className="mr-2 h-4 w-4" />
									New Notification
								</Link>
							</Button>
						</div>
					</div>

					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Subject</TableHead>
									<TableHead>Type</TableHead>
									<TableHead className="hidden md:table-cell">
										Recipients
									</TableHead>
									<TableHead className="hidden md:table-cell">
										Sent Date
									</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paginatedNotifications.length > 0 ? (
									paginatedNotifications.map((notification) => (
										<TableRow key={notification.id}>
											<TableCell className="font-medium">
												{notification.title}
											</TableCell>
											<TableCell>{notification.type}</TableCell>
											<TableCell className="hidden md:table-cell">
												{notification.profiles
													? `${notification.profiles.full_name || "-"} (${
															notification.profiles.email
													  })`
													: "-"}
											</TableCell>
											<TableCell className="hidden md:table-cell">
												{new Date(notification.created_at).toLocaleDateString()}
											</TableCell>
											<TableCell>
												<span
													className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
														notification.is_read
															? "bg-green-100 text-green-800"
															: "bg-red-100 text-red-800"
													}`}>
													{notification.is_read ? "Read" : "Unread"}
												</span>
											</TableCell>
											<TableCell className="text-right">
												<Button variant="ghost" size="sm" asChild>
													<Link
														href={`/admin/notifications/${notification.id}`}>
														View
													</Link>
												</Button>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={6} className="text-center py-8">
											<p className="text-muted-foreground">
												No notifications found.
											</p>
											<Button variant="outline" className="mt-4" asChild>
												<Link href="/admin/notifications/new">
													<Plus className="mr-2 h-4 w-4" />
													Send First Notification
												</Link>
											</Button>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-end space-x-2 mt-4">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
								disabled={currentPage === 1}>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<span className="text-sm">
								Page {currentPage} of {totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setCurrentPage((prev) => Math.min(prev + 1, totalPages))
								}
								disabled={currentPage === totalPages}>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
