"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SessionTimeRangePicker } from "@/components/ui/date-time-picker";

interface ReactivationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (data: { date: string; time: string; notes?: string }) => void;
	sessionTitle: string;
	isLoading?: boolean;
}

function formatToUTCString(date: Date | undefined): string {
	if (!date) return "";
	const pad = (n: number) => n.toString().padStart(2, "0");
	return (
		date.getUTCFullYear() +
		"-" +
		pad(date.getUTCMonth() + 1) +
		"-" +
		pad(date.getUTCDate()) +
		" " +
		pad(date.getUTCHours()) +
		":" +
		pad(date.getUTCMinutes()) +
		":" +
		pad(date.getUTCSeconds()) +
		"+00"
	);
}

export function ReactivationDialog({
	isOpen,
	onClose,
	onConfirm,
	sessionTitle,
	isLoading = false,
}: ReactivationDialogProps) {
	const [formData, setFormData] = useState({
		startDate: undefined as Date | undefined,
		endDate: undefined as Date | undefined,
		notes: "",
	});

	const handleSubmit = () => {
		if (!formData.startDate || !formData.endDate) {
			return;
		}
		const start_time = formatToUTCString(formData.startDate);
		const end_time = formatToUTCString(formData.endDate);
		onConfirm({
			start_time,
			end_time,
			notes: formData.notes,
		});
		setFormData({ startDate: undefined, endDate: undefined, notes: "" });
	};

	const handleClose = () => {
		setFormData({ startDate: undefined, endDate: undefined, notes: "" });
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Reactivate Session</DialogTitle>
					<DialogDescription>
						Reactivate "{sessionTitle}" by selecting a new date and time.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<SessionTimeRangePicker
						startDate={formData.startDate}
						endDate={formData.endDate}
						onStartDateChange={(date) =>
							setFormData((prev) => ({ ...prev, startDate: date }))
						}
						onEndDateChange={(date) =>
							setFormData((prev) => ({ ...prev, endDate: date }))
						}
					/>
					<div className="grid gap-2">
						<Label htmlFor="reactivate-notes">Notes (Optional)</Label>
						<Textarea
							id="reactivate-notes"
							value={formData.notes}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, notes: e.target.value }))
							}
							placeholder="Reason for reactivation or additional notes..."
							rows={3}
							disabled={isLoading}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={isLoading}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!formData.startDate || !formData.endDate || isLoading}>
						{isLoading ? "Reactivating..." : "Reactivate Session"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
