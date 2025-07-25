"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bell, Calendar, Check, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";

// Enhanced interface for notification data
interface Notification {
	id: string;
	title: string;
	message: string;
	is_read: boolean;
	created_at: string;
	type?: string;
	metadata?: any; // Add metadata support
}

export default function NotificationsPage() {
	const auth = useAuth();
	const { toast } = useToast();
	const router = useRouter();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("all");
	const [member, setMember] = useState<any>(null);

	useEffect(() => {
		if (auth.user) {
			loadMemberAndNotifications();
		}
	}, [auth.user]);

	// Load member data and notifications
	const loadMemberAndNotifications = async () => {
		try {
			setLoading(true);
			const supabase = createClient();

			if (!auth.user) {
				setNotifications([]);
				setLoading(false);
				return;
			}

			// First, get the member data to ensure the user is a member
			const { data: memberData, error: memberError } = await supabase
				.from("members")
				.select("id, user_id, membership_status")
				.eq("user_id", auth.user.id)
				.single();

			if (memberError) {
				console.error("Error loading member data:", memberError);
				toast({
					title: "Error",
					description: "Could not load member information.",
					variant: "destructive",
				});
				setLoading(false);
				return;
			}

			setMember(memberData);

			// Now fetch notifications for this member's user_id
			const { data: notificationsData, error: notificationsError } =
				await supabase
					.from("notifications")
					.select("id, title, message, is_read, created_at, type, metadata")
					.eq("user_id", auth.user.id)
					.order("created_at", { ascending: false })
					.limit(50); // Increased limit for better user experience

			if (notificationsError) {
				console.error("Error loading notifications:", notificationsError);
				toast({
					title: "Error Loading Notifications",
					description: "Could not load your notifications.",
					variant: "destructive",
				});
				setNotifications([]);
			} else {
				setNotifications(notificationsData || []);
			}
		} catch (error) {
			console.error("Error in loadMemberAndNotifications:", error);
			toast({
				title: "Error",
				description:
					"An unexpected error occurred while loading notifications.",
				variant: "destructive",
			});
			setNotifications([]);
		} finally {
			setLoading(false);
		}
	};

	const unreadCount = notifications.filter(
		(notification) => !notification.is_read
	).length;

	const filteredNotifications =
		activeTab === "all"
			? notifications
			: activeTab === "unread"
			? notifications.filter((notification) => !notification.is_read)
			: notifications.filter((notification) => notification.is_read);

	// Mark as read
	const markAsRead = async (id: string) => {
		try {
			const supabase = createClient();
			const { error } = await supabase
				.from("notifications")
				.update({ is_read: true })
				.eq("id", id);

			if (error) {
				throw error;
			}

			setNotifications((prev) =>
				prev.map((notification) =>
					notification.id === id
						? { ...notification, is_read: true }
						: notification
				)
			);

			toast({
				title: "Success",
				description: "Notification marked as read.",
			});
		} catch (error) {
			console.error("Error marking notification as read:", error);
			toast({
				title: "Error",
				description: "Failed to mark notification as read.",
				variant: "destructive",
			});
		}
	};

	// Mark all as read
	const markAllAsRead = async () => {
		try {
			const supabase = createClient();
			if (!auth.user) return;

			const { error } = await supabase
				.from("notifications")
				.update({ is_read: true })
				.eq("user_id", auth.user.id)
				.eq("is_read", false);

			if (error) {
				throw error;
			}

			setNotifications((prev) =>
				prev.map((notification) => ({ ...notification, is_read: true }))
			);

			toast({
				title: "Success",
				description: "All notifications marked as read.",
			});
		} catch (error) {
			console.error("Error marking all notifications as read:", error);
			toast({
				title: "Error",
				description: "Failed to mark all notifications as read.",
				variant: "destructive",
			});
		}
	};

	// Format date for display
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

		if (diffInHours < 1) {
			return "Just now";
		} else if (diffInHours < 24) {
			return `${Math.floor(diffInHours)}h ago`;
		} else if (diffInHours < 48) {
			return "Yesterday";
		} else {
			return date.toLocaleDateString();
		}
	};

	const getNotificationIcon = (type: string | undefined) => {
		switch (type) {
			case "reminder":
				return <Clock className="h-5 w-5 text-blue-500" />;
			case "alert":
				return <Bell className="h-5 w-5 text-amber-500" />;
			case "cancellation":
				return <Calendar className="h-5 w-5 text-red-500" />;
			case "update":
				return <Check className="h-5 w-5 text-green-500" />;
			case "announcement":
				return <Bell className="h-5 w-5 text-primary" />;
			default:
				return <Bell className="h-5 w-5 text-primary" />;
		}
	};

	// Refresh notifications
	const refreshNotifications = () => {
		loadMemberAndNotifications();
	};

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.back()}
						className="mr-2"
						aria-label="Go back">
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<h1 className="text-2xl font-bold">Notifications</h1>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={refreshNotifications}
					disabled={loading}>
					{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
				</Button>
			</div>

			{/* Member Status Card */}
			{member && (
				<Card className="bg-muted/30">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-medium">Membership Status</h3>
								<p className="text-sm text-muted-foreground">
									Member ID: {member.id}
								</p>
							</div>
							<Badge
								variant={
									member.membership_status === "active"
										? "default"
										: "destructive"
								}>
								{member.membership_status?.charAt(0).toUpperCase() +
									member.membership_status?.slice(1) || "Unknown"}
							</Badge>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Your Notifications</CardTitle>
						<CardDescription>
							Stay updated with important gym information and updates
						</CardDescription>
					</div>
					{unreadCount > 0 && (
						<Button variant="outline" size="sm" onClick={markAllAsRead}>
							Mark All as Read
						</Button>
					)}
				</CardHeader>
				<CardContent>
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="space-y-4">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="all">
								All
								<Badge variant="secondary" className="ml-2">
									{notifications.length}
								</Badge>
							</TabsTrigger>
							<TabsTrigger value="unread">
								Unread
								{unreadCount > 0 && (
									<Badge variant="secondary" className="ml-2">
										{unreadCount}
									</Badge>
								)}
							</TabsTrigger>
							<TabsTrigger value="read">Read</TabsTrigger>
						</TabsList>

						<TabsContent value={activeTab} className="space-y-4">
							{loading ? (
								<div className="text-center py-8">
									<Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
									<p className="text-muted-foreground">
										Loading notifications...
									</p>
								</div>
							) : filteredNotifications.length > 0 ? (
								filteredNotifications.map((notification) => (
									<div
										key={notification.id}
										className={`border rounded-lg p-4 transition-colors ${
											!notification.is_read
												? "bg-muted/30 border-primary/20"
												: "bg-background hover:bg-muted/10"
										}`}>
										<div className="flex items-start gap-3">
											<div className="mt-0.5">
												{getNotificationIcon(notification.type)}
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between">
													<h3 className="font-medium text-sm">
														{notification.title}
													</h3>
													{!notification.is_read && (
														<Badge variant="secondary" className="text-xs">
															New
														</Badge>
													)}
												</div>
												<div className="text-sm text-muted-foreground mt-1 break-words">
													{notification.message}
												</div>
												{notification.metadata && (
													<div className="mt-2 text-xs text-muted-foreground">
														{Object.entries(notification.metadata).map(
															([key, value]) => (
																<div key={key}>
																	<strong>{key}:</strong> {String(value)}
																</div>
															)
														)}
													</div>
												)}
												<div className="flex items-center justify-between mt-3">
													<p className="text-xs text-muted-foreground">
														{formatDate(notification.created_at)}
													</p>
													{!notification.is_read && (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => markAsRead(notification.id)}
															className="text-xs h-7 px-2">
															Mark as Read
														</Button>
													)}
												</div>
											</div>
										</div>
									</div>
								))
							) : (
								<div className="text-center py-8">
									<Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<h3 className="font-medium text-lg">No notifications</h3>
									<p className="text-sm text-muted-foreground">
										{activeTab === "unread"
											? "You've read all your notifications."
											: activeTab === "read"
											? "You don't have any read notifications yet."
											: "You don't have any notifications yet."}
									</p>
								</div>
							)}
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}
