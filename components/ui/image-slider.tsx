"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SliderImage {
	id: string;
	imageUrl: string;
	title?: string;
	subtitle?: string;
	sortOrder: number;
}

interface ImageSliderProps {
	images: SliderImage[];
	className?: string;
	showControls?: boolean;
	showIndicators?: boolean;
	autoPlay?: boolean;
	interval?: number;
	showOverlay?: boolean;
	overlayContent?: (image: SliderImage) => React.ReactNode;
}

export function ImageSlider({
	images,
	className = "",
	showControls = true,
	showIndicators = true,
	autoPlay = true,
	interval = 5000,
	showOverlay = false,
	overlayContent,
}: ImageSliderProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isTransitioning, setIsTransitioning] = useState(false);

	// Filter active images and sort by sortOrder
	const activeImages = images
		.filter((img) => img.imageUrl && img.imageUrl !== "")
		.sort((a, b) => a.sortOrder - b.sortOrder);

	// Auto-play functionality
	useEffect(() => {
		if (!autoPlay || activeImages.length <= 1) return;

		const timer = setInterval(() => {
			nextSlide();
		}, interval);

		return () => clearInterval(timer);
	}, [currentIndex, autoPlay, interval, activeImages.length]);

	// Reset current index if it exceeds available images
	useEffect(() => {
		if (currentIndex >= activeImages.length && activeImages.length > 0) {
			setCurrentIndex(0);
		}
	}, [activeImages.length, currentIndex]);

	const nextSlide = () => {
		if (activeImages.length <= 1) return;
		
		setIsTransitioning(true);
		setTimeout(() => {
			setCurrentIndex((prev) => (prev + 1) % activeImages.length);
			setIsTransitioning(false);
		}, 150);
	};

	const prevSlide = () => {
		if (activeImages.length <= 1) return;
		
		setIsTransitioning(true);
		setTimeout(() => {
			setCurrentIndex((prev) => (prev - 1 + activeImages.length) % activeImages.length);
			setIsTransitioning(false);
		}, 150);
	};

	const goToSlide = (index: number) => {
		if (index === currentIndex || activeImages.length <= 1) return;
		
		setIsTransitioning(true);
		setTimeout(() => {
			setCurrentIndex(index);
			setIsTransitioning(false);
		}, 150);
	};

	// If no images, show placeholder
	if (activeImages.length === 0) {
		return (
			<div className={`relative overflow-hidden ${className}`}>
				<div className="w-full h-full bg-gray-200 flex items-center justify-center">
					<div className="text-center text-gray-500">
						<p className="text-lg font-medium">No images available</p>
						<p className="text-sm">Add images to see the slider</p>
					</div>
				</div>
			</div>
		);
	}

	const currentImage = activeImages[currentIndex];

	return (
		<div className={`relative overflow-hidden group ${className}`}>
			{/* Main Image */}
			<div className="relative w-full h-full">
				<img
					src={currentImage.imageUrl}
					alt={currentImage.title || `Slide ${currentIndex + 1}`}
					className={`w-full h-full object-cover transition-opacity duration-300 ${
						isTransitioning ? "opacity-70" : "opacity-100"
					}`}
					onError={(e) => {
						const target = e.target as HTMLImageElement;
						if (target.src !== "/placeholder.svg") {
							target.src = "/placeholder.svg";
						}
					}}
				/>

				{/* Overlay Content */}
				{showOverlay && overlayContent && (
					<div className="absolute inset-0 flex items-center justify-center">
						{overlayContent(currentImage)}
					</div>
				)}
			</div>

			{/* Navigation Controls */}
			{showControls && activeImages.length > 1 && (
				<>
					<Button
						variant="ghost"
						size="icon"
						className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
						onClick={prevSlide}
						disabled={isTransitioning}
					>
						<ChevronLeft className="h-6 w-6" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
						onClick={nextSlide}
						disabled={isTransitioning}
					>
						<ChevronRight className="h-6 w-6" />
					</Button>
				</>
			)}

			{/* Indicators */}
			{showIndicators && activeImages.length > 1 && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
					{activeImages.map((_, index) => (
						<button
							key={index}
							className={`w-2 h-2 rounded-full transition-all duration-300 ${
								index === currentIndex
									? "bg-white scale-125"
									: "bg-white/50 hover:bg-white/80"
							}`}
							onClick={() => goToSlide(index)}
							disabled={isTransitioning}
						/>
					))}
				</div>
			)}

			{/* Image Counter */}
			{activeImages.length > 1 && (
				<div className="absolute top-4 right-4 bg-black/20 text-white px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
					{currentIndex + 1} / {activeImages.length}
				</div>
			)}
		</div>
	);
}