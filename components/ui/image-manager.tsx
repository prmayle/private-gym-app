"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Trash2, GripVertical, Plus, X } from "lucide-react";
import Image from "next/image";

interface ImageItem {
	id: string;
	imageUrl: string;
	sortOrder: number;
}

interface ImageManagerProps {
	images: ImageItem[];
	onImagesChange: (images: ImageItem[]) => void;
	onImageUpload: (files: FileList) => Promise<void>;
	onImageDelete: (imageId: string) => Promise<void>;
	onImageReorder: (fromIndex: number, toIndex: number) => void;
	maxImages?: number;
	className?: string;
	loading?: boolean;
}

export function ImageManager({
	images,
	onImagesChange,
	onImageUpload,
	onImageDelete,
	onImageReorder,
	maxImages = 10,
	className = "",
	loading = false
}: ImageManagerProps) {
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;
		
		await onImageUpload(files);
		
		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, [onImageUpload]);

	const handleDragStart = (e: React.DragEvent, index: number) => {
		setDraggedIndex(index);
		e.dataTransfer.effectAllowed = 'move';
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOverIndex(index);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOverIndex(null);
	};

	const handleDrop = (e: React.DragEvent, dropIndex: number) => {
		e.preventDefault();
		
		if (draggedIndex !== null && draggedIndex !== dropIndex) {
			onImageReorder(draggedIndex, dropIndex);
		}
		
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Upload Area */}
			<div className="border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors">
				<div className="p-6 text-center">
					<div className="mx-auto w-12 h-12 text-gray-400 mb-4">
						<Upload className="w-full h-full" />
					</div>
					<div className="space-y-2">
						<p className="text-lg font-medium">Upload Images</p>
						<p className="text-sm text-gray-500">
							Drop multiple images here or click to browse
							{maxImages && ` (max ${maxImages} images)`}
						</p>
					</div>
					<div className="mt-4">
						<Button 
							variant="outline" 
							onClick={() => fileInputRef.current?.click()}
							disabled={loading || (maxImages && images.length >= maxImages)}
						>
							<Plus className="w-4 h-4 mr-2" />
							Choose Files
						</Button>
					</div>
				</div>
			</div>

			{/* Images Grid */}
			{images.length > 0 && (
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{images.map((image, index) => (
						<Card
							key={image.id}
							className={`relative group cursor-move transition-all duration-200 ${
								draggedIndex === index ? 'opacity-50 scale-95' : ''
							} ${
								dragOverIndex === index ? 'ring-2 ring-primary scale-105' : ''
							}`}
							draggable={!loading}
							onDragStart={(e) => handleDragStart(e, index)}
							onDragOver={(e) => handleDragOver(e, index)}
							onDragLeave={handleDragLeave}
							onDrop={(e) => handleDrop(e, index)}
							onDragEnd={handleDragEnd}
						>
							{/* Drag Handle */}
							<div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
								<div className="bg-black/50 text-white p-1 rounded">
									<GripVertical className="w-4 h-4" />
								</div>
							</div>

							{/* Delete Button */}
							<Button
								variant="destructive"
								size="icon"
								className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6"
								onClick={() => onImageDelete(image.id)}
								disabled={loading}
							>
								<X className="w-3 h-3" />
							</Button>

							{/* Order Badge */}
							<div className="absolute bottom-2 left-2 z-10 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
								{index + 1}
							</div>

							{/* Image */}
							<div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
								<Image
									src={image.imageUrl}
									alt={`Image ${index + 1}`}
									fill
									className="object-cover"
									onError={(e) => {
										const target = e.target as HTMLImageElement;
										if (target.src !== "/placeholder.svg") {
											target.src = "/placeholder.svg";
										}
									}}
								/>
							</div>
						</Card>
					))}
				</div>
			)}

			{/* Empty State */}
			{images.length === 0 && (
				<div className="text-center py-12 text-gray-500">
					<Upload className="mx-auto w-12 h-12 mb-4 text-gray-400" />
					<p className="text-lg font-medium mb-2">No images uploaded yet</p>
					<p className="text-sm">Upload your first image to get started</p>
				</div>
			)}

			{/* Hidden File Input */}
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept="image/*"
				onChange={handleFileSelect}
				className="hidden"
			/>
		</div>
	);
}