"use client";

import React from "react";

interface LoadingOverlayProps {
	show: boolean;
	message?: string;
}

export function LoadingOverlay({ show, message = "Processing..." }: LoadingOverlayProps) {
	if (!show) return null;

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
			<div className="bg-white/95 dark:bg-gray-900/95 shadow-2xl rounded-2xl p-8 flex items-center space-x-4 border border-gray-200 dark:border-gray-700 max-w-sm mx-4">
				{/* Animated Spinner */}
				<div className="relative">
					<div className="animate-spin rounded-full h-10 w-10 border-3 border-gray-300 dark:border-gray-600 border-t-primary"></div>
					<div className="absolute top-0 left-0 animate-ping rounded-full h-10 w-10 border-2 border-primary/30"></div>
				</div>

				{/* Message */}
				<div className="flex flex-col">
					<span className="text-lg font-semibold text-gray-900 dark:text-white">
						{message}
					</span>
					<span className="text-sm text-gray-600 dark:text-gray-400">
						Please wait a moment...
					</span>
				</div>
			</div>
		</div>
	);
}