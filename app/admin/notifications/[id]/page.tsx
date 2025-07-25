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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Clock, Mail, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Notification, UserProfile } from "@/lib/supabase";

export default function NotificationDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const [notification, setNotification] = useState<
		(Notification & { profiles?: UserProfile }) | null
	>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchNotification = async () => {
			const supabase = createClient();
			const { data, error } = await supabase
				.from("notifications")
				.select("*, profiles:user_id (id, full_name, email)")
				.eq("id", params.id)
				.single();
			if (!error && data) {
				setNotification(data);
			}
			setLoading(false);
		};
		fetchNotification();
	}, [params.id]);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.back()}
						className="mr-2"
						aria-label="Go back">
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<h1 className="text-2xl font-bold">Loading...</h1>
				</div>
			</div>
		);
	}

	if (!notification) {
		return (
			<div className="space-y-6">
				<div className="flex items-center">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.back()}
						className="mr-2"
						aria-label="Go back">
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<h1 className="text-2xl font-bold">Notification Not Found</h1>
				</div>
				<Card>
					<CardContent className="text-center py-8">
						<p className="text-muted-foreground">
							The requested notification could not be found.
						</p>
						<Button
							variant="outline"
							className="mt-4"
							onClick={() => router.back()}>
							Go Back
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.back()}
					className="mr-2"
					aria-label="Go back">
					<ArrowLeft className="h-5 w-5" />
				</Button>
				<h1 className="text-2xl font-bold">Notification Details</h1>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Notification Content */}
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									<Mail className="h-5 w-5" />
									Notification Content
								</CardTitle>
								<Badge
									variant={notification.is_read ? "default" : "destructive"}>
									{notification.is_read ? "Read" : "Unread"}
								</Badge>
							</div>
							<CardDescription>
								{notification.type} • Sent on{" "}
								{new Date(notification.created_at).toLocaleDateString()}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h3 className="font-medium text-sm text-muted-foreground mb-2">
									Title
								</h3>
								<p className="text-lg font-medium">{notification.title}</p>
							</div>

							<Separator />

							<div>
								<h3 className="font-medium text-sm text-muted-foreground mb-2">
									Message Content
								</h3>
								<div className="bg-muted/50 rounded-lg p-4">
									<p className="whitespace-pre-wrap">{notification.message}</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Delivery Information */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Clock className="h-5 w-5" />
								Delivery Information
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<h3 className="font-medium text-sm text-muted-foreground mb-1">
										Sent Date
									</h3>
									<div className="flex items-center gap-1">
										<Calendar className="h-4 w-4 text-muted-foreground" />
										<span>
											{new Date(notification.created_at).toLocaleDateString()}
										</span>
									</div>
								</div>
								<div>
									<h3 className="font-medium text-sm text-muted-foreground mb-1">
										Delivery Status
									</h3>
									<Badge
										variant={notification.is_read ? "default" : "destructive"}>
										{notification.is_read ? "Read" : "Unread"}
									</Badge>
								</div>
								<div>
									<h3 className="font-medium text-sm text-muted-foreground mb-1">
										Recipient
									</h3>
									<div className="flex items-center gap-1">
										<Users className="h-4 w-4 text-muted-foreground" />
										<span>
											{notification.profiles
												? `${notification.profiles.full_name || "-"} (${
														notification.profiles.email
												  })`
												: "-"}
										</span>
									</div>
								</div>
								<div>
									<h3 className="font-medium text-sm text-muted-foreground mb-1">
										Notification Type
									</h3>
									<Badge variant="outline">{notification.type}</Badge>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
