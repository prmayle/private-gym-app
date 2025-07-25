"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Notification } from "@/lib/supabase";

// Mock data for members
const mockMembers = [
	{ id: "1", name: "John Doe", email: "john.doe@example.com" },
	{ id: "2", name: "Jane Smith", email: "jane.smith@example.com" },
	{ id: "3", name: "Michael Johnson", email: "michael.johnson@example.com" },
	{ id: "4", name: "Emily Williams", email: "emily.williams@example.com" },
	{ id: "5", name: "Robert Brown", email: "robert.brown@example.com" },
];

// Mock data for notification templates
const mockTemplates = [
	{
		id: "1",
		name: "Session Reminder",
		subject: "Your upcoming session reminder",
		content:
			"Hi {memberName}, this is a reminder that you have a {sessionType} session scheduled for {date} at {time} with {trainer}. Please arrive 10 minutes early.",
	},
	{
		id: "2",
		name: "Package Expiry Warning",
		subject: "Your package is about to expire",
		content:
			"Hi {memberName}, your {packageType} package will expire on {expiryDate}. Please contact us to renew your package and continue your fitness journey.",
	},
	{
		id: "3",
		name: "Welcome Message",
		subject: "Welcome to Core Factory!",
		content:
			"Hi {memberName}, welcome to Core Factory! We're excited to have you join our fitness community. Your trainer will contact you soon to schedule your first session.",
	},
	{
		id: "4",
		name: "Session Cancellation",
		subject: "Session Cancellation Notice",
		content:
			"Hi {memberName}, we regret to inform you that your {sessionType} session scheduled for {date} at {time} has been cancelled due to {reason}. We will reschedule at your earliest convenience.",
	},
	{
		id: "5",
		name: "General Announcement",
		subject: "Important Gym Announcement",
		content:
			"Hi {memberName}, we have an important announcement: {announcement}. Thank you for your attention.",
	},
];

export default function NewNotificationPage() {
	const router = useRouter();
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);
	const [selectedMembers, setSelectedMembers] = useState([]);
	const [selectAll, setSelectAll] = useState(false);
	const [selectedTemplate, setSelectedTemplate] = useState("");
	const [formData, setFormData] = useState({
		subject: "",
		content: "",
		sendToAll: false,
	});

	const handleTemplateChange = (templateId) => {
		setSelectedTemplate(templateId);
		const template = mockTemplates.find((t) => t.id === templateId);
		if (template) {
			setFormData({
				...formData,
				subject: template.subject,
				content: template.content,
			});
		}
	};

	const handleSelectAll = (checked) => {
		setSelectAll(checked);
		if (checked) {
			setSelectedMembers(mockMembers.map((member) => member.id));
		} else {
			setSelectedMembers([]);
		}
	};

	const handleMemberSelect = (memberId, checked) => {
		if (checked) {
			setSelectedMembers([...selectedMembers, memberId]);
		} else {
			setSelectedMembers(selectedMembers.filter((id) => id !== memberId));
			setSelectAll(false);
		}
	};

	const handleSendNotification = async () => {
		if (!formData.subject || !formData.content) {
			toast({
				title: "Missing Information",
				description: "Please fill in both subject and content.",
				variant: "destructive",
			});
			return;
		}

		setIsLoading(true);

		try {
			const supabase = createClient();
			const { data, error } = await supabase.from("notifications").insert([
				{
					user_id: "admin", // or the actual admin user id if available
					title: formData.subject,
					message: formData.content,
					type: selectedTemplate
						? mockTemplates.find((t) => t.id === selectedTemplate)?.name ||
						  "Custom"
						: "Custom",
					is_read: false,
					metadata: null,
				},
			]);
			if (error) throw error;

			toast({
				title: "Notification Sent",
				description: `Notification sent successfully.`,
			});

			// Reset form
			setFormData({ subject: "", content: "", sendToAll: false });
			setSelectedMembers([]);
			setSelectAll(false);
			setSelectedTemplate("");

			// Navigate back to notifications
			router.push("/admin/notifications");
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to send notification. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

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
				<h1 className="text-2xl font-bold">Send Notification</h1>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Notification Form */}
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Compose Notification</CardTitle>
							<CardDescription>
								Create and send notifications to your members
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="template">Use Template (Optional)</Label>
								<Select
									value={selectedTemplate}
									onValueChange={handleTemplateChange}>
									<SelectTrigger id="template">
										<SelectValue placeholder="Select a template" />
									</SelectTrigger>
									<SelectContent>
										{mockTemplates.map((template) => (
											<SelectItem key={template.id} value={template.id}>
												{template.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="subject">Subject</Label>
								<Input
									id="subject"
									value={formData.subject}
									onChange={(e) =>
										setFormData({ ...formData, subject: e.target.value })
									}
									placeholder="Enter notification subject"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="content">Message Content</Label>
								<Textarea
									id="content"
									value={formData.content}
									onChange={(e) =>
										setFormData({ ...formData, content: e.target.value })
									}
									placeholder="Enter your message here..."
									rows={8}
								/>
								<p className="text-xs text-muted-foreground">
									You can use placeholders like {"{memberName}"},{" "}
									{"{sessionType}"}, {"{date}"}, {"{time}"}, etc.
								</p>
							</div>

							<div className="flex items-center space-x-2">
								<Checkbox
									id="sendToAll"
									checked={formData.sendToAll}
									onCheckedChange={(checked) =>
										setFormData({ ...formData, sendToAll: checked })
									}
								/>
								<Label htmlFor="sendToAll">Send to all members</Label>
							</div>

							<Button
								onClick={handleSendNotification}
								disabled={isLoading}
								className="w-full">
								<Send className="mr-2 h-4 w-4" />
								{isLoading ? "Sending..." : "Send Notification"}
							</Button>
						</CardContent>
					</Card>
				</div>

				{/* Member Selection */}
				<div>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center">
								<Users className="mr-2 h-5 w-5" />
								Select Recipients
							</CardTitle>
							<CardDescription>
								{formData.sendToAll
									? "Notification will be sent to all members"
									: `${selectedMembers.length} member(s) selected`}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{!formData.sendToAll && (
								<div className="space-y-4">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="selectAll"
											checked={selectAll}
											onCheckedChange={handleSelectAll}
										/>
										<Label htmlFor="selectAll" className="font-medium">
											Select All
										</Label>
									</div>

									<div className="space-y-2 max-h-64 overflow-y-auto">
										{mockMembers.map((member) => (
											<div
												key={member.id}
												className="flex items-center space-x-2">
												<Checkbox
													id={`member-${member.id}`}
													checked={selectedMembers.includes(member.id)}
													onCheckedChange={(checked) =>
														handleMemberSelect(member.id, checked)
													}
												/>
												<Label
													htmlFor={`member-${member.id}`}
													className="text-sm">
													<div>
														<p className="font-medium">{member.name}</p>
														<p className="text-muted-foreground">
															{member.email}
														</p>
													</div>
												</Label>
											</div>
										))}
									</div>
								</div>
							)}

							{formData.sendToAll && (
								<div className="text-center py-8">
									<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<p className="text-sm text-muted-foreground">
										This notification will be sent to all {mockMembers.length}{" "}
										members.
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
