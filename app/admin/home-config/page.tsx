"use client";

import React from "react";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PhoneInputField } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, Plus, Trash, Upload, GripVertical, Move } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { getSliderImages, upsertSliderImage, deleteSliderImage, updateSliderImageOrder } from "@/lib/supabase";
import { ImageManager } from "@/components/ui/image-manager";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

// Type definitions for home page configuration
interface HeroConfig {
	title: string;
	subtitle: string;
	showButton: boolean;
	buttonText: string;
	buttonLink: string;
}

interface AboutConfig {
	title: string;
	content: string;
	showImage: boolean;
	bulletPoints: string[];
}

interface FeatureConfig {
	id: string;
	title: string;
	description: string;
	icon: string;
}

interface FeaturesConfig {
	title: string;
	subtitle: string;
	features: FeatureConfig[];
}

interface TestimonialConfig {
	id: string;
	name: string;
	role: string;
	content: string;
	image: string;
}

interface TestimonialsConfig {
	title: string;
	subtitle: string;
	testimonials: TestimonialConfig[];
}

interface TrainerConfig {
	id: string;
	name: string;
	bio: string;
	specializations: string;
	profilePhotoUrl: string;
	isAvailable: boolean;
}

interface TrainersConfig {
	title: string;
	subtitle: string;
	trainers: TrainerConfig[];
}

interface ContactConfig {
	title: string;
	subtitle: string;
	address: string;
	phone: string;
	email: string;
	showMap: boolean;
	mapLocation: string;
}

interface FooterConfig {
	companyName: string;
	tagline: string;
	showSocial: boolean;
	socialLinks: {
		facebook: string;
		instagram: string;
		twitter: string;
		youtube: string;
	};
	quickLinks: string[];
}

interface SliderImageConfig {
	id: string;
	sectionName: string;
	imageUrl: string;
	sortOrder: number;
}

interface HomePageConfig {
	hero: HeroConfig;
	about: AboutConfig;
	features: FeaturesConfig;
	trainers: TrainersConfig;
	testimonials: TestimonialsConfig;
	contact: ContactConfig;
	footer: FooterConfig;
}

export default function HomeConfigPage() {
	const { toast } = useToast();
	const [config, setConfig] = useState<HomePageConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [globalLoading, setGlobalLoading] = useState(false);
	const [loadingMessage, setLoadingMessage] = useState("Processing...");
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState("hero");
	const [heroSliderImages, setHeroSliderImages] = useState<SliderImageConfig[]>([]);
	const [aboutSliderImages, setAboutSliderImages] = useState<SliderImageConfig[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Load data once on mount
	useEffect(() => {
		loadHomeConfig();

		// Set up real-time subscription
		// const supabase = createClient();
		// const channel = supabase
		// 	.channel("home-config-changes")
		// 	.on(
		// 		"postgres_changes",
		// 		{
		// 			event: "*",
		// 			schema: "public",
		// 			table: "page_sections",
		// 		},
		// 		() => {
		// 			loadHomeConfig();
		// 		}
		// 	)
		// 	.on(
		// 		"postgres_changes",
		// 		{
		// 			event: "*",
		// 			schema: "public",
		// 			table: "features",
		// 		},
		// 		() => {
		// 			loadHomeConfig();
		// 		}
		// 	)
		// 	.on(
		// 		"postgres_changes",
		// 		{
		// 			event: "*",
		// 			schema: "public",
		// 			table: "testimonials",
		// 		},
		// 		() => {
		// 			loadHomeConfig();
		// 		}
		// 	)
		// 	.subscribe();

		// return () => {
		// 	supabase.removeChannel(channel);
		// };
	}, []);

	const loadHomeConfig = async () => {
		try {
			const supabase = createClient();

			// Get home page
			let { data: homePage } = await supabase
				.from("pages")
				.select("id")
				.eq("slug", "home")
				.single();

			if (!homePage) {
				// Create home page if it doesn't exist
				const { data: newPage } = await supabase
					.from("pages")
					.insert({
						slug: "home",
						title: "Home Page",
						description: "Main home page configuration",
						is_published: true,
					})
					.select("id")
					.single();

				if (!newPage) throw new Error("Could not create home page");
				homePage = newPage;
			}

			// Load page sections, features, testimonials, trainers, and slider images in parallel
			const [sectionsResult, featuresResult, testimonialsResult, trainersResult, heroSliderResult, aboutSliderResult] =
				await Promise.all([
					supabase
						.from("page_sections")
						.select(
							`
						id,
						content_data,
						sections(name)
					`
						)
						.eq("page_id", homePage.id)
						.eq("is_enabled", true),

					supabase
						.from("features")
						.select("*")
						.eq("is_active", true)
						.order("sort_order"),

					supabase
						.from("testimonials")
						.select("*")
						.eq("is_active", true)
						.order("sort_order"),

					supabase
						.from("trainers")
						.select(`
							id,
							bio,
							specializations,
							profile_photo_url,
							is_available,
							profiles(full_name)
						`)
						.eq("is_available", true),

					getSliderImages(supabase, 'hero'),
					getSliderImages(supabase, 'about')
				]);

			// Build config object
			const configData: any = {};

			console.log("🔍 Sections result:", sectionsResult);
			console.log("🔍 Features result:", featuresResult);
			console.log("🔍 Testimonials result:", testimonialsResult);
			console.log("🔍 Trainers result:", trainersResult);
			console.log("🔍 Config data:", configData);

			// Process sections
			if (sectionsResult.data) {
				console.log("🔍 Processing sections data:", sectionsResult.data);
				for (const section of sectionsResult.data) {
					const sectionName = (section.sections as any)?.name;
					console.log(
						"🔍 Processing section:",
						sectionName,
						"with content:",
						section.content_data
					);
					if (sectionName && section.content_data) {
						configData[sectionName] = section.content_data;
						console.log(
							"🔍 Added to configData:",
							sectionName,
							configData[sectionName]
						);
					}
				}
			}

			// Process features
			if (featuresResult.data) {
				console.log("🔍 Processing features data:", featuresResult.data);
				const featuresSection = configData.features || {};
				console.log("🔍 Features section from configData:", featuresSection);
				configData.features = {
					title: featuresSection.title || "",
					subtitle: featuresSection.subtitle || "",
					features: featuresResult.data.map((f) => ({
						id: f.id,
						title: f.title,
						description: f.description,
						icon: f.icon,
					})),
				};
				console.log("🔍 Final features config:", configData.features);
			}

			// Process testimonials
			if (testimonialsResult.data) {
				const testimonialsSection = configData.testimonials || {};
				configData.testimonials = {
					title: testimonialsSection.title || "",
					subtitle: testimonialsSection.subtitle || "",
					testimonials: testimonialsResult.data.map((t) => ({
						id: t.id,
						name: t.name,
						role: t.role,
						content: t.content,
						image: t.image_url || "",
					})),
				};
			}

			// Process trainers
			if (trainersResult.data) {
				const trainersSection = configData.trainers || {};
				configData.trainers = {
					title: trainersSection.title || "",
					subtitle: trainersSection.subtitle || "",
					trainers: trainersResult.data.map((t) => ({
						id: t.id,
						name: (t.profiles as any)?.full_name || "",
						bio: t.bio || "",
						specializations: Array.isArray(t.specializations) ? t.specializations.join(", ") : (t.specializations || ""),
						profilePhotoUrl: t.profile_photo_url || "",
						isAvailable: t.is_available || false,
					})),
				};
			}

			console.log("🔍 after processing Sections result:", sectionsResult);
			console.log("🔍 after processing Features result:", featuresResult);
			console.log(
				"🔍 after processing Testimonials result:",
				testimonialsResult
			);
			console.log("🔍 after processing Config data:", configData);

			// Process slider images
			if (heroSliderResult) {
				setHeroSliderImages(heroSliderResult.map(img => ({
					id: img.id,
					sectionName: img.section_name,
					imageUrl: img.image_url,
					sortOrder: img.sort_order
				})));
			}

			if (aboutSliderResult) {
				setAboutSliderImages(aboutSliderResult.map(img => ({
					id: img.id,
					sectionName: img.section_name,
					imageUrl: img.image_url,
					sortOrder: img.sort_order
				})));
			}

			// Only set config if we have data from Supabase, no static defaults
			if (Object.keys(configData).length > 0) {
				setConfig({
					hero: configData.hero || {
						title: "",
						subtitle: "",
						showButton: false,
						buttonText: "",
						buttonLink: "",
						backgroundImage: "",
					},
					about: configData.about || {
						title: "",
						content: "",
						showImage: false,
						image: "",
						bulletPoints: [],
					},
					features: configData.features || {
						title: "",
						subtitle: "",
						features: [],
					},
					trainers: configData.trainers || {
						title: "",
						subtitle: "",
						trainers: [],
					},
					testimonials: configData.testimonials || {
						title: "",
						subtitle: "",
						testimonials: [],
					},
					contact: configData.contact || {
						title: "",
						subtitle: "",
						address: "",
						phone: "",
						email: "",
						showMap: false,
						mapLocation: "",
					},
					footer: configData.footer || {
						companyName: "",
						tagline: "",
						showSocial: false,
						socialLinks: {
							facebook: "",
							instagram: "",
							twitter: "",
							youtube: "",
						},
						quickLinks: [],
					},
				});
			} else {
				// No data in Supabase, create empty config
				setConfig({
					hero: {
						title: "",
						subtitle: "",
						showButton: false,
						buttonText: "",
						buttonLink: "",
						backgroundImage: "",
					},
					about: {
						title: "",
						content: "",
						showImage: false,
						image: "",
						bulletPoints: [],
					},
					features: {
						title: "",
						subtitle: "",
						features: [],
					},
					trainers: {
						title: "",
						subtitle: "",
						trainers: [],
					},
					testimonials: {
						title: "",
						subtitle: "",
						testimonials: [],
					},
					contact: {
						title: "",
						subtitle: "",
						address: "",
						phone: "",
						email: "",
						showMap: false,
						mapLocation: "",
					},
					footer: {
						companyName: "",
						tagline: "",
						showSocial: false,
						socialLinks: {
							facebook: "",
							instagram: "",
							twitter: "",
							youtube: "",
						},
						quickLinks: [],
					},
				});
			}
		} catch (error) {
			console.error("Load error:", error);
			toast({
				title: "Error",
				description: "Failed to load configuration",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const updateConfig = (section: keyof HomePageConfig, data: any) => {
		if (!config) return;

		setConfig((prev) => ({
			...prev!,
			[section]: { ...prev![section], ...data },
		}));
	};

	const saveSection = async (sectionName: string) => {
		if (saving || !config) return;

		try {
			setSaving(true);
			const supabase = createClient();
			const sectionData = config[sectionName as keyof HomePageConfig];

			// Get home page
			const { data: homePage } = await supabase
				.from("pages")
				.select("id")
				.eq("slug", "home")
				.single();

			if (!homePage) throw new Error("Home page not found");

			// Get or create section
			const { data: section, error: sectionError } = await supabase
				.from("sections")
				.upsert(
					{
						name: sectionName,
						display_name:
							sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
						is_active: true,
					},
					{
						onConflict: "name",
						ignoreDuplicates: false,
					}
				)
				.select("id")
				.single();

			if (sectionError) throw sectionError;
			if (!section) throw new Error("Could not create section");

			// Define sort order for each section
			const sortOrders: { [key: string]: number } = {
				hero: 0,
				about: 1,
				features: 2,
				trainers: 3,
				testimonials: 4,
				contact: 5,
				footer: 6,
			};

			const sortOrder = sortOrders[sectionName] || 0;

			// Check if page_section already exists
			const { data: existingPageSection } = await supabase
				.from("page_sections")
				.select("id")
				.eq("page_id", homePage.id)
				.eq("section_id", section.id)
				.maybeSingle();

			if (existingPageSection) {
				// Update existing page section
				const { error: updateError } = await supabase
					.from("page_sections")
					.update({
						content_data: sectionData,
						sort_order: sortOrder,
						is_enabled: true,
						updated_at: new Date().toISOString(),
					})
					.eq("id", existingPageSection.id);

				if (updateError) throw updateError;
			} else {
				// Insert new page section
				const { error: insertError } = await supabase
					.from("page_sections")
					.insert({
						page_id: homePage.id,
						section_id: section.id,
						content_data: sectionData,
						is_enabled: true,
						sort_order: sortOrder,
					});

				if (insertError) throw insertError;
			}

			toast({
				title: "Success",
				description: `${sectionName} section saved`,
			});
		} catch (error) {
			console.error("Save error:", error);
			toast({
				title: "Error",
				description: "Failed to save section",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const saveFeature = async (feature: FeatureConfig) => {
		try {
			setSaving(true);
			const supabase = createClient();
			await supabase.from("features").upsert({
				id: feature.id.startsWith("new-") ? undefined : feature.id,
				title: feature.title,
				description: feature.description,
				icon: feature.icon,
				is_active: true,
				updated_at: new Date().toISOString(),
			});

			// Reload to get updated data
			await loadHomeConfig();

			toast({
				title: "Success",
				description: "Feature saved",
			});
		} catch (error) {
			console.error("Feature save error:", error);
			toast({
				title: "Error",
				description: "Failed to save feature",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const deleteFeature = async (id: string) => {
		if (id.startsWith("new-")) {
			// Remove from local state for new items
			updateConfig("features", {
				features: config!.features.features.filter((f) => f.id !== id),
			});
			return;
		}

		try {
			const supabase = createClient();
			await supabase.from("features").update({ is_active: false }).eq("id", id);

			// Reload to get updated data
			await loadHomeConfig();

			toast({
				title: "Success",
				description: "Feature deleted",
			});
		} catch (error) {
			console.error("Delete error:", error);
			toast({
				title: "Error",
				description: "Failed to delete feature",
				variant: "destructive",
			});
		}
	};

	const saveTestimonial = async (testimonial: TestimonialConfig) => {
		try {
			setSaving(true);
			const supabase = createClient();
			await supabase.from("testimonials").upsert({
				id: testimonial.id.startsWith("new-") ? undefined : testimonial.id,
				name: testimonial.name,
				role: testimonial.role,
				content: testimonial.content,
				image_url: testimonial.image,
				is_active: true,
				updated_at: new Date().toISOString(),
			});

			// Reload to get updated data
			await loadHomeConfig();

			toast({
				title: "Success",
				description: "Testimonial saved",
			});
		} catch (error) {
			console.error("Testimonial save error:", error);
			toast({
				title: "Error",
				description: "Failed to save testimonial",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const deleteTestimonial = async (id: string) => {
		if (id.startsWith("new-")) {
			// Remove from local state for new items
			updateConfig("testimonials", {
				testimonials: config!.testimonials.testimonials.filter(
					(t) => t.id !== id
				),
			});
			return;
		}

		try {
			const supabase = createClient();
			await supabase
				.from("testimonials")
				.update({ is_active: false })
				.eq("id", id);

			// Reload to get updated data
			await loadHomeConfig();

			toast({
				title: "Success",
				description: "Testimonial deleted",
			});
		} catch (error) {
			console.error("Delete error:", error);
			toast({
				title: "Error",
				description: "Failed to delete testimonial",
				variant: "destructive",
			});
		}
	};

	const addFeature = () => {
		const newFeature: FeatureConfig = {
			id: `new-${Date.now()}`,
			title: "",
			description: "",
			icon: "",
		};

		updateConfig("features", {
			features: [...config!.features.features, newFeature],
		});
	};

	const updateFeature = (
		index: number,
		field: keyof FeatureConfig,
		value: string
	) => {
		const updatedFeatures = [...config!.features.features];
		updatedFeatures[index] = { ...updatedFeatures[index], [field]: value };
		updateConfig("features", { features: updatedFeatures });
	};

	const addTestimonial = () => {
		const newTestimonial: TestimonialConfig = {
			id: `new-${Date.now()}`,
			name: "",
			role: "",
			content: "",
			image: "",
		};

		updateConfig("testimonials", {
			testimonials: [...config!.testimonials.testimonials, newTestimonial],
		});
	};

	const updateTestimonial = (
		index: number,
		field: keyof TestimonialConfig,
		value: string
	) => {
		const updatedTestimonials = [...config!.testimonials.testimonials];
		updatedTestimonials[index] = {
			...updatedTestimonials[index],
			[field]: value,
		};
		updateConfig("testimonials", { testimonials: updatedTestimonials });
	};

	const addBulletPoint = () => {
		updateConfig("about", {
			bulletPoints: [...config!.about.bulletPoints, ""],
		});
	};

	const updateBulletPoint = (index: number, value: string) => {
		const updatedPoints = [...config!.about.bulletPoints];
		updatedPoints[index] = value;
		updateConfig("about", { bulletPoints: updatedPoints });
	};

	const removeBulletPoint = (index: number) => {
		updateConfig("about", {
			bulletPoints: config!.about.bulletPoints.filter((_, i) => i !== index),
		});
	};

	const addQuickLink = () => {
		updateConfig("footer", {
			quickLinks: [...config!.footer.quickLinks, ""],
		});
	};

	const updateQuickLink = (index: number, value: string) => {
		const updatedLinks = [...config!.footer.quickLinks];
		updatedLinks[index] = value;
		updateConfig("footer", { quickLinks: updatedLinks });
	};

	const removeQuickLink = (index: number) => {
		updateConfig("footer", {
			quickLinks: config!.footer.quickLinks.filter((_, i) => i !== index),
		});
	};

	// Slider Image Management Functions
	const handleSliderImageUpload = async (sectionName: 'hero' | 'about', files: FileList) => {
		try {
			setGlobalLoading(true);
			setLoadingMessage(`Uploading ${files.length} image${files.length > 1 ? 's' : ''}...`);

			const supabase = createClient();
			const currentImages = sectionName === 'hero' ? heroSliderImages : aboutSliderImages;

			// Process each file
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const formData = new FormData();
				formData.append("file", file);
				formData.append("section", "slider");
				formData.append("field", "image");

				// Upload to local API
				const response = await fetch("/api/upload", {
					method: "POST",
					body: formData,
				});

				if (!response.ok) {
					throw new Error(`Failed to upload ${file.name}`);
				}

				const result = await response.json();
				const imageUrl = result.filePath;

				// Save to database
				await upsertSliderImage(supabase, {
					sectionName,
					imageUrl,
					sortOrder: currentImages.length + i
				});
			}

			// Reload slider images
			await reloadSliderImages();

			toast({
				title: "Success",
				description: `${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully`,
			});
		} catch (error) {
			console.error('Upload error:', error);
			toast({
				title: "Error",
				description: "Failed to upload images",
				variant: "destructive",
			});
		} finally {
			setGlobalLoading(false);
		}
	};

	const handleSliderImageReorder = async (sectionName: 'hero' | 'about', fromIndex: number, toIndex: number) => {
		try {
			setGlobalLoading(true);
			setLoadingMessage("Reordering images...");

			const currentImages = sectionName === 'hero' ? heroSliderImages : aboutSliderImages;
			const reorderedImages = [...currentImages];
			const [movedImage] = reorderedImages.splice(fromIndex, 1);
			reorderedImages.splice(toIndex, 0, movedImage);

			// Update sort orders
			const supabase = createClient();
			for (let i = 0; i < reorderedImages.length; i++) {
				await updateSliderImageOrder(supabase, reorderedImages[i].id, i);
			}

			// Update local state
			if (sectionName === 'hero') {
				setHeroSliderImages(reorderedImages.map((img, idx) => ({ ...img, sortOrder: idx })));
			} else {
				setAboutSliderImages(reorderedImages.map((img, idx) => ({ ...img, sortOrder: idx })));
			}

			toast({
				title: "Success",
				description: "Images reordered successfully",
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to reorder images",
				variant: "destructive",
			});
		} finally {
			setGlobalLoading(false);
		}
	};

	const handleSliderImageDelete = async (sectionName: 'hero' | 'about', imageId: string) => {
		try {
			setGlobalLoading(true);
			setLoadingMessage("Deleting image...");

			const supabase = createClient();
			await deleteSliderImage(supabase, imageId);

			// Reload slider images
			await reloadSliderImages();

			toast({
				title: "Success",
				description: "Image deleted successfully",
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete image",
				variant: "destructive",
			});
		} finally {
			setGlobalLoading(false);
		}
	};

	const reloadSliderImages = async () => {
		try {
			const supabase = createClient();
			const [heroSliderResult, aboutSliderResult] = await Promise.all([
				getSliderImages(supabase, 'hero'),
				getSliderImages(supabase, 'about')
			]);

			if (heroSliderResult) {
				setHeroSliderImages(heroSliderResult.map(img => ({
					id: img.id,
					sectionName: img.section_name,
					imageUrl: img.image_url,
					sortOrder: img.sort_order
				})));
			}

			if (aboutSliderResult) {
				setAboutSliderImages(aboutSliderResult.map(img => ({
					id: img.id,
					sectionName: img.section_name,
					imageUrl: img.image_url,
					sortOrder: img.sort_order
				})));
			}
		} catch (error) {
			console.error('Failed to reload slider images:', error);
		}
	};

	const saveAllSettings = async () => {
		if (saving || globalLoading || !config) return;

		try {
			setGlobalLoading(true);
			setLoadingMessage("Saving all settings...");
			setSaving(true);
			const supabase = createClient();

			// Get or create home page
			let { data: homePage } = await supabase
				.from("pages")
				.select("id")
				.eq("slug", "home")
				.single();

			if (!homePage) {
				const { data: newPage } = await supabase
					.from("pages")
					.insert({
						slug: "home",
						title: "Home Page",
						description: "Main home page configuration",
						is_published: true,
					})
					.select("id")
					.single();
				homePage = newPage;
			}

			if (!homePage) throw new Error("Could not create home page");

			// Helper function to update existing page section or create new one
			const updateOrCreateSection = async (
				sectionName: string,
				contentData: any,
				sortOrder: number
			) => {
				// Get or create section in sections table
				const { data: section, error: sectionError } = await supabase
					.from("sections")
					.upsert(
						{
							name: sectionName,
							display_name:
								sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
							is_active: true,
						},
						{
							onConflict: "name",
							ignoreDuplicates: false,
						}
					)
					.select("id")
					.single();

				if (sectionError) throw sectionError;
				if (!section)
					throw new Error(`Could not create ${sectionName} section`);

				// Check if page_section already exists using composite key
				const { data: existingPageSection } = await supabase
					.from("page_sections")
					.select("id")
					.eq("page_id", homePage.id)
					.eq("section_id", section.id)
					.maybeSingle();

				// Check if another section already has this sort_order
				const { data: conflictingSection } = await supabase
					.from("page_sections")
					.select("id, section_id")
					.eq("page_id", homePage.id)
					.eq("sort_order", sortOrder)
					.neq("section_id", section.id)
					.maybeSingle();

				if (conflictingSection) {
					// Update the conflicting section to have a temporary sort_order
					await supabase
						.from("page_sections")
						.update({ sort_order: 999 })
						.eq("id", conflictingSection.id);
				}

				if (existingPageSection) {
					// Update existing page_section
					const { error: updateError } = await supabase
						.from("page_sections")
						.update({
							content_data: contentData,
							sort_order: sortOrder,
							is_enabled: true,
							updated_at: new Date().toISOString(),
						})
						.eq("id", existingPageSection.id);

					if (updateError) throw updateError;
				} else {
					// Insert new page_section
					const { error: insertError } = await supabase
						.from("page_sections")
						.insert({
							page_id: homePage.id,
							section_id: section.id,
							content_data: contentData,
							is_enabled: true,
							sort_order: sortOrder,
						});

					if (insertError) throw insertError;
				}
			};

			// Step 1: Save all sections in parallel
			setLoadingMessage("Saving page sections...");
			const sectionPromises = [
				updateOrCreateSection("hero", config.hero, 0),
				updateOrCreateSection("about", config.about, 1),
				updateOrCreateSection("features", {
					title: config.features.title,
					subtitle: config.features.subtitle,
				}, 2),
				updateOrCreateSection("trainers", {
					title: config.trainers.title,
					subtitle: config.trainers.subtitle,
				}, 3),
				updateOrCreateSection("testimonials", {
					title: config.testimonials.title,
					subtitle: config.testimonials.subtitle,
				}, 4),
				updateOrCreateSection("contact", config.contact, 5),
				updateOrCreateSection("footer", config.footer, 6)
			];
			await Promise.all(sectionPromises);

			// Step 2: Save features in batch
			if (config.features.features.length > 0) {
				setLoadingMessage("Saving features...");
				const featurePromises = config.features.features.map(async (feature) => {
					return supabase.from("features").upsert({
						id: feature.id.startsWith("new-") ? undefined : feature.id,
						title: feature.title,
						description: feature.description,
						icon: feature.icon,
						is_active: true,
						updated_at: new Date().toISOString(),
					});
				});
				const featureResults = await Promise.allSettled(featurePromises);
				const featureFailures = featureResults.filter(r => r.status === 'rejected');
				if (featureFailures.length > 0) {
					console.warn(`${featureFailures.length} features failed to save`);
				}
			}

			// Step 3: Save testimonials in batch
			if (config.testimonials.testimonials.length > 0) {
				setLoadingMessage("Saving testimonials...");
				const testimonialPromises = config.testimonials.testimonials.map(async (testimonial) => {
					return supabase.from("testimonials").upsert({
						id: testimonial.id.startsWith("new-") ? undefined : testimonial.id,
						name: testimonial.name,
						role: testimonial.role,
						content: testimonial.content,
						image_url: testimonial.image,
						is_active: true,
						updated_at: new Date().toISOString(),
					});
				});
				const testimonialResults = await Promise.allSettled(testimonialPromises);
				const testimonialFailures = testimonialResults.filter(r => r.status === 'rejected');
				if (testimonialFailures.length > 0) {
					console.warn(`${testimonialFailures.length} testimonials failed to save`);
				}
			}

			// Step 4: Reload config
			setLoadingMessage("Refreshing data...");
			await loadHomeConfig();

			toast({
				title: "Success",
				description: "All settings saved successfully",
			});
		} catch (error) {
			console.error("Save all error:", error);
			toast({
				title: "Error",
				description: `Failed to save settings: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
			setGlobalLoading(false);
		}
	};

	// Handle image upload
	const handleImageUpload = async (
		section: string,
		field: string,
		testimonialId?: string,
		sliderImageId?: string
	) => {
		console.log(
			"🖼️ Initiating image upload for section:",
			section,
			"field:",
			field,
			"testimonialId:",
			testimonialId,
			"sliderImageId:",
			sliderImageId
		);
		if (fileInputRef.current) {
			console.log(
				"📁 Setting up file input with section and field data - section:",
				section,
				"field:",
				field,
				"testimonialId:",
				testimonialId,
				"sliderImageId:",
				sliderImageId
			);
			// Store the section and field for when file is selected
			fileInputRef.current.dataset.section = section;
			fileInputRef.current.dataset.field = field;
			if (testimonialId) {
				fileInputRef.current.dataset.testimonialId = testimonialId;
			}
			if (sliderImageId) {
				fileInputRef.current.dataset.sliderImageId = sliderImageId;
			}
			console.log(
				"🖱️ Triggering file input click for section:",
				section,
				"field:",
				field,
				"testimonialId:",
				testimonialId,
				"sliderImageId:",
				sliderImageId
			);
			fileInputRef.current.click();
		} else {
			console.log(
				"❌ File input ref not available for section:",
				section,
				"field:",
				field
			);
		}
	};

	// Handle file selection
	const handleFileSelect = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const section = event.target.dataset.section;
		const field = event.target.dataset.field;
		const testimonialId = event.target.dataset.testimonialId;
		const sliderImageId = event.target.dataset.sliderImageId;

		console.log(
			"📁 Starting file upload process for section:",
			section,
			"field:",
			field,
			"testimonialId:",
			testimonialId,
			"sliderImageId:",
			sliderImageId
		);

		try {
			// Create FormData for upload
			const formData = new FormData();
			formData.append("file", file);
			formData.append("section", section || "");
			formData.append("field", field || "");

			console.log(
				"📤 Uploading file:",
				file.name,
				"for section:",
				section,
				"field:",
				field
			);

			// For testimonial uploads, add the testimonial ID to the form data
			if (section === "testimonial" && testimonialId) {
				formData.append("testimonialId", testimonialId);
			}

			// For slider image uploads, add the slider image ID to the form data
			if (section === "slider" && sliderImageId) {
				formData.append("sliderImageId", sliderImageId);
			}

			// Upload to local API
			const response = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response
					.json()
					.catch(() => ({ error: "Upload failed" }));
				console.log("❌ Upload failed with error:", errorData);
				throw new Error(errorData.error || "Upload failed");
			}

			const result = await response.json();
			console.log("✅ Upload successful, server response:", result);

			const publicPath = result.filePath;
			console.log("🔗 Generated public path for image:", publicPath);

			// Update config with new image URL based on section and field
			if (section === "hero" && field === "backgroundImage") {
				console.log("🏠 Updating hero background image with path:", publicPath);
				updateConfig("hero", { backgroundImage: publicPath });
			} else if (section === "about" && field === "image") {
				console.log("ℹ️ Updating about section image with path:", publicPath);
				updateConfig("about", { image: publicPath });
			} else if (
				section === "testimonial" &&
				field === "image" &&
				testimonialId
			) {
				console.log(
					"💬 Processing testimonial image update for ID:",
					testimonialId
				);

				console.log(
					"🔍 Current testimonials in config:",
					config!.testimonials.testimonials.map((t) => ({
						id: t.id,
						name: t.name,
					}))
				);
				console.log(
					"🔍 Looking for testimonial with ID:",
					testimonialId,
					"Type:",
					typeof testimonialId
				);

				const testimonialIndex = config!.testimonials.testimonials.findIndex(
					(t) => {
						console.log(
							"🔍 Comparing t.id:",
							t.id,
							"(type:",
							typeof t.id,
							") with testimonialId:",
							testimonialId,
							"(type:",
							typeof testimonialId,
							")"
						);
						const match = t.id.toString() === testimonialId.toString();
						console.log("🔍 Match result:", match);
						return match;
					}
				);
				console.log("📍 Found testimonial at index:", testimonialIndex);

				if (testimonialIndex !== -1) {
					console.log(
						"✏️ Updating testimonial image at index",
						testimonialIndex,
						"with path:",
						publicPath
					);
					updateTestimonial(testimonialIndex, "image", publicPath);
				} else {
					console.log(
						"⚠️ Testimonial with ID",
						testimonialId,
						"not found in config"
					);
				}
			} else if (section === "slider" && field === "image" && sliderImageId) {
				console.log(
					"🖼️ Processing slider image update for ID:",
					sliderImageId
				);

				// Find and update the slider image
				const heroIndex = heroSliderImages.findIndex(img => img.id === sliderImageId);
				const aboutIndex = aboutSliderImages.findIndex(img => img.id === sliderImageId);

				if (heroIndex !== -1) {
					console.log("✏️ Updating hero slider image at index", heroIndex);
					updateSliderImage('hero', heroIndex, 'imageUrl', publicPath);
				} else if (aboutIndex !== -1) {
					console.log("✏️ Updating about slider image at index", aboutIndex);
					updateSliderImage('about', aboutIndex, 'imageUrl', publicPath);
				} else {
					console.log("⚠️ Slider image with ID", sliderImageId, "not found");
				}
			} else {
				console.log("⚠️ Unknown section/field combination:", section, field);
			}

			// Force a re-render by updating the config state
			console.log("🔄 Forcing config re-render to reflect image changes");
			setConfig((prev) => ({ ...prev! }));

			console.log("🎉 Image upload and config update completed successfully");
			toast({
				title: "Success",
				description: "Image uploaded successfully",
			});
		} catch (error) {
			console.error("💥 Upload error occurred:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to upload image",
				variant: "destructive",
			});
		}

		// Reset file input
		event.target.value = "";
	};

	if (loading) {
		return (
			<div className="container mx-auto py-6">
				<div className="animate-pulse space-y-4">
					<div className="h-8 bg-gray-200 rounded w-1/4"></div>
					<div className="h-64 bg-gray-200 rounded"></div>
				</div>
			</div>
		);
	}

	if (!config) {
		return <div>Failed to load configuration</div>;
	}

	return (
		<div className="container mx-auto py-6 space-y-6 relative">
			{/* Global Loading Overlay */}
			<LoadingOverlay show={globalLoading} message={loadingMessage} />

			<div className="flex items-center justify-between">
				<div className="flex items-center">
					<Button variant="ghost" size="sm" className="mr-2" asChild>
						<Link href="/admin">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Admin
						</Link>
					</Button>
					<h1 className="text-2xl font-bold">Home Page Configuration</h1>
				</div>
				<div className="flex space-x-2">
					<Button variant="outline" onClick={() => window.open("/", "_blank")}>
						<Eye className="h-4 w-4 mr-2" />
						Preview
					</Button>
					<Button onClick={saveAllSettings} disabled={saving}>
						{saving ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-4">
				<TabsList className="grid grid-cols-3 md:grid-cols-7 w-full">
					<TabsTrigger value="hero">Hero</TabsTrigger>
					<TabsTrigger value="about">About</TabsTrigger>
					<TabsTrigger value="features">Services</TabsTrigger>
					<TabsTrigger value="trainers">Trainers</TabsTrigger>
					<TabsTrigger value="testimonials">Testimonials</TabsTrigger>
					<TabsTrigger value="contact">Contact</TabsTrigger>
					<TabsTrigger value="footer">Footer</TabsTrigger>
				</TabsList>

				{/* Hero Section */}
				<TabsContent value="hero" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Hero Section</CardTitle>
							<CardDescription>
								Configure the main banner of your home page
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Basic Hero Settings */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="heroTitle">Title</Label>
									<Input
										id="heroTitle"
										value={config.hero.title}
										onChange={(e) =>
											updateConfig("hero", { title: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="heroSubtitle">Subtitle</Label>
									<Input
										id="heroSubtitle"
										value={config.hero.subtitle}
										onChange={(e) =>
											updateConfig("hero", { subtitle: e.target.value })
										}
									/>
								</div>
							</div>

							{/* Call-to-Action Button */}
							<div className="space-y-4">
								<div className="flex items-center space-x-2">
									<Switch
										id="heroShowButton"
										checked={config.hero.showButton}
										onCheckedChange={(checked) =>
											updateConfig("hero", { showButton: checked })
										}
									/>
									<Label htmlFor="heroShowButton">
										Show Call-to-Action Button
									</Label>
								</div>

								{config.hero.showButton && (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="heroButtonText">Button Text</Label>
											<Input
												id="heroButtonText"
												value={config.hero.buttonText}
												onChange={(e) =>
													updateConfig("hero", { buttonText: e.target.value })
												}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="heroButtonLink">Button Link</Label>
											<Input
												id="heroButtonLink"
												value={config.hero.buttonLink}
												onChange={(e) =>
													updateConfig("hero", { buttonLink: e.target.value })
												}
											/>
										</div>
									</div>
								)}
							</div>

							{/* Background Images/Slider */}
							<div className="space-y-4">
								<div>
									<h3 className="text-lg font-medium mb-2">Background Images</h3>
									<p className="text-sm text-muted-foreground mb-4">
										Upload multiple images to create a slideshow, or a single image for a static background.
									</p>
								</div>

								<ImageManager
									images={heroSliderImages}
									onImagesChange={setHeroSliderImages}
									onImageUpload={(files) => handleSliderImageUpload('hero', files)}
									onImageDelete={(imageId) => handleSliderImageDelete('hero', imageId)}
									onImageReorder={(fromIndex, toIndex) => handleSliderImageReorder('hero', fromIndex, toIndex)}
									maxImages={5}
									loading={globalLoading}
								/>
							</div>
						</CardContent>
					</Card>
				</TabsContent>


				{/* About Section */}
				<TabsContent value="about" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>About Section</CardTitle>
							<CardDescription>
								Configure the introduction section of your home page
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Basic About Settings */}
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="aboutTitle">Title</Label>
									<Input
										id="aboutTitle"
										value={config.about.title}
										onChange={(e) =>
											updateConfig("about", { title: e.target.value })
										}
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="aboutContent">Content</Label>
									<Textarea
										id="aboutContent"
										rows={4}
										value={config.about.content}
										onChange={(e) =>
											updateConfig("about", { content: e.target.value })
										}
									/>
								</div>
							</div>

							{/* Bullet Points */}
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<Label>Bullet Points</Label>
									<Button variant="outline" size="sm" onClick={addBulletPoint}>
										<Plus className="h-4 w-4 mr-2" />
										Add Point
									</Button>
								</div>
								<div className="space-y-2">
									{config.about.bulletPoints.map((point, index) => (
										<div key={index} className="flex items-center space-x-2">
											<Input
												value={point}
												onChange={(e) =>
													updateBulletPoint(index, e.target.value)
												}
											/>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => removeBulletPoint(index)}>
												<Trash className="h-4 w-4 text-red-500" />
											</Button>
										</div>
									))}
								</div>
							</div>

							{/* Images Toggle */}
							<div className="flex items-center space-x-2">
								<Switch
									id="aboutShowImage"
									checked={config.about.showImage}
									onCheckedChange={(checked) =>
										updateConfig("about", { showImage: checked })
									}
								/>
								<Label htmlFor="aboutShowImage">Show Images</Label>
							</div>

							{/* Image Slider/Manager */}
							{config.about.showImage && (
								<div className="space-y-4">
									<div>
										<h3 className="text-lg font-medium mb-2">About Images</h3>
										<p className="text-sm text-muted-foreground mb-4">
											Upload multiple images to create a slideshow, or a single image for a static display.
										</p>
									</div>

									<ImageManager
										images={aboutSliderImages}
										onImagesChange={setAboutSliderImages}
										onImageUpload={(files) => handleSliderImageUpload('about', files)}
										onImageDelete={(imageId) => handleSliderImageDelete('about', imageId)}
										onImageReorder={(fromIndex, toIndex) => handleSliderImageReorder('about', fromIndex, toIndex)}
										maxImages={5}
										loading={globalLoading}
									/>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>


				{/* Features/Services Section */}
				<TabsContent value="features" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Services Section</CardTitle>
							<CardDescription>
								Configure the services offered by your gym
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="featuresTitle">Title</Label>
									<Input
										id="featuresTitle"
										value={config.features.title}
										onChange={(e) =>
											updateConfig("features", { title: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="featuresSubtitle">Subtitle</Label>
									<Input
										id="featuresSubtitle"
										value={config.features.subtitle}
										onChange={(e) =>
											updateConfig("features", { subtitle: e.target.value })
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label>Services</Label>
									<Button variant="outline" size="sm" onClick={addFeature}>
										<Plus className="h-4 w-4 mr-2" />
										Add Service
									</Button>
								</div>

								<div className="space-y-4">
									{config.features.features.map((feature, index) => (
										<Card key={feature.id}>
											<CardContent className="pt-4 space-y-4">
												<div className="flex justify-between items-start">
													<div className="space-y-2 flex-1">
														<div className="space-y-2">
															<Label htmlFor={`featureTitle-${feature.id}`}>
																Title
															</Label>
															<Input
																id={`featureTitle-${feature.id}`}
																value={feature.title}
																onChange={(e) =>
																	updateFeature(index, "title", e.target.value)
																}
															/>
														</div>
														<div className="space-y-2">
															<Label htmlFor={`featureDesc-${feature.id}`}>
																Description
															</Label>
															<Textarea
																id={`featureDesc-${feature.id}`}
																value={feature.description}
																onChange={(e) =>
																	updateFeature(
																		index,
																		"description",
																		e.target.value
																	)
																}
															/>
														</div>
														<div className="space-y-2">
															<Label htmlFor={`featureIcon-${feature.id}`}>
																Icon
															</Label>
															<Select
																value={feature.icon}
																onValueChange={(value) =>
																	updateFeature(index, "icon", value)
																}>
																<SelectTrigger id={`featureIcon-${feature.id}`}>
																	<SelectValue placeholder="Select an icon" />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="dumbbell">
																		Dumbbell
																	</SelectItem>
																	<SelectItem value="users">Group</SelectItem>
																	<SelectItem value="apple">
																		Nutrition
																	</SelectItem>
																	<SelectItem value="heart">Health</SelectItem>
																	<SelectItem value="star">Star</SelectItem>
																</SelectContent>
															</Select>
														</div>
														<div className="flex gap-2">
															<Button
																onClick={() => saveFeature(feature)}
																size="sm"
																className="flex-1">
																Save
															</Button>
														</div>
													</div>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => deleteFeature(feature.id)}
														className="ml-2">
														<Trash className="h-4 w-4 text-red-500" />
													</Button>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Trainers Section */}
				<TabsContent value="trainers" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Trainers Section</CardTitle>
							<CardDescription>
								Configure the trainers section of your home page
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="trainersTitle">Title</Label>
									<Input
										id="trainersTitle"
										value={config.trainers.title}
										onChange={(e) =>
											updateConfig("trainers", { title: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="trainersSubtitle">Subtitle</Label>
									<Input
										id="trainersSubtitle"
										value={config.trainers.subtitle}
										onChange={(e) =>
											updateConfig("trainers", { subtitle: e.target.value })
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label>Trainers to Display</Label>
								<div className="space-y-4">
									{config.trainers.trainers.map((trainer, index) => (
										<Card key={trainer.id}>
											<CardContent className="pt-4 space-y-4">
												<div className="flex items-center space-x-4">
													<div className="flex items-center space-x-2">
														<Switch
															id={`trainerVisible-${trainer.id}`}
															checked={trainer.isAvailable}
															onCheckedChange={(checked) => {
																const updatedTrainers = [...config.trainers.trainers];
																updatedTrainers[index] = { ...updatedTrainers[index], isAvailable: checked };
																updateConfig("trainers", { trainers: updatedTrainers });
															}}
														/>
														<Label htmlFor={`trainerVisible-${trainer.id}`}>
															Show on Homepage
														</Label>
													</div>
												</div>
												<div className="flex items-center space-x-4">
													<div className="relative w-16 h-16">
														<img
															src={trainer.profilePhotoUrl || "/placeholder.svg"}
															alt={trainer.name}
															className="rounded-full object-cover w-full h-full"
														/>
													</div>
													<div className="flex-1">
														<h3 className="font-semibold">{trainer.name}</h3>
														<p className="text-sm text-foreground/70">{trainer.specializations}</p>
														<p className="text-sm text-foreground/60 line-clamp-2">{trainer.bio}</p>
													</div>
												</div>
											</CardContent>
										</Card>
									))}
									{config.trainers.trainers.length === 0 && (
										<div className="text-center py-8 text-foreground/50">
											No trainers found. Add trainers in the Trainers management section first.
										</div>
									)}
								</div>
							</div>

							<div className="flex gap-2">
								<Button
									onClick={() => saveSection("trainers")}
									className="flex-1">
									Save Trainers Section
								</Button>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Testimonials Section */}
				<TabsContent value="testimonials" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Testimonials Section</CardTitle>
							<CardDescription>
								Configure member testimonials for your home page
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="testimonialsTitle">Title</Label>
									<Input
										id="testimonialsTitle"
										value={config.testimonials.title}
										onChange={(e) =>
											updateConfig("testimonials", { title: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="testimonialsSubtitle">Subtitle</Label>
									<Input
										id="testimonialsSubtitle"
										value={config.testimonials.subtitle}
										onChange={(e) =>
											updateConfig("testimonials", { subtitle: e.target.value })
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label>Testimonials</Label>
									<Button variant="outline" size="sm" onClick={addTestimonial}>
										<Plus className="h-4 w-4 mr-2" />
										Add Testimonial
									</Button>
								</div>

								<div className="space-y-4">
									{config.testimonials.testimonials.map(
										(testimonial, index) => (
											<Card key={testimonial.id}>
												<CardContent className="pt-4 space-y-4">
													<div className="flex justify-between items-start">
														<div className="space-y-4 flex-1">
															<div className="flex items-center space-x-4">
																<div className="relative w-16 h-16">
																	<img
																		src={
																			testimonial.image || "/placeholder.svg"
																		}
																		alt={testimonial.name}
																		className="rounded-full object-cover w-full h-full"
																		onError={(e) => {
																			const target =
																				e.target as HTMLImageElement;
																			if (target.src !== "/placeholder.svg") {
																				console.log(
																					"Testimonial image failed to load:",
																					target.src
																				);
																				target.src = "/placeholder.svg";
																			}
																		}}
																		onLoad={() => {
																			console.log(
																				"Testimonial image loaded successfully:",
																				testimonial.image
																			);
																		}}
																	/>
																	<Button
																		variant="outline"
																		size="icon"
																		className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full"
																		onClick={() =>
																			handleImageUpload(
																				"testimonial",
																				"image",
																				testimonial.id
																			)
																		}>
																		<Upload className="h-3 w-3" />
																	</Button>
																</div>
																<div className="space-y-2 flex-1">
																	<div className="space-y-2">
																		<Label
																			htmlFor={`testimonialName-${testimonial.id}`}>
																			Name
																		</Label>
																		<Input
																			id={`testimonialName-${testimonial.id}`}
																			value={testimonial.name}
																			onChange={(e) =>
																				updateTestimonial(
																					index,
																					"name",
																					e.target.value
																				)
																			}
																		/>
																	</div>
																	<div className="space-y-2">
																		<Label
																			htmlFor={`testimonialRole-${testimonial.id}`}>
																			Role/Title
																		</Label>
																		<Input
																			id={`testimonialRole-${testimonial.id}`}
																			value={testimonial.role}
																			onChange={(e) =>
																				updateTestimonial(
																					index,
																					"role",
																					e.target.value
																				)
																			}
																		/>
																	</div>
																</div>
															</div>
															<div className="space-y-2">
																<Label
																	htmlFor={`testimonialContent-${testimonial.id}`}>
																	Testimonial
																</Label>
																<Textarea
																	id={`testimonialContent-${testimonial.id}`}
																	value={testimonial.content}
																	onChange={(e) =>
																		updateTestimonial(
																			index,
																			"content",
																			e.target.value
																		)
																	}
																/>
															</div>
															<div className="flex gap-2">
																<Button
																	onClick={() => saveTestimonial(testimonial)}
																	size="sm"
																	className="flex-1">
																	Save
																</Button>
															</div>
														</div>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => deleteTestimonial(testimonial.id)}
															className="ml-2">
															<Trash className="h-4 w-4 text-red-500" />
														</Button>
													</div>
												</CardContent>
											</Card>
										)
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Contact Section */}
				<TabsContent value="contact" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Contact Section</CardTitle>
							<CardDescription>
								Configure contact information for your gym
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="contactTitle">Title</Label>
									<Input
										id="contactTitle"
										value={config.contact.title}
										onChange={(e) =>
											updateConfig("contact", { title: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="contactSubtitle">Subtitle</Label>
									<Input
										id="contactSubtitle"
										value={config.contact.subtitle}
										onChange={(e) =>
											updateConfig("contact", { subtitle: e.target.value })
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="contactAddress">Address</Label>
								<Input
									id="contactAddress"
									value={config.contact.address}
									onChange={(e) =>
										updateConfig("contact", { address: e.target.value })
									}
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="contactPhone">Phone</Label>
									<PhoneInputField
										id="contactPhone"
										value={config.contact.phone}
										onChange={(value) =>
											updateConfig("contact", { phone: value || "" })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="contactEmail">Email</Label>
									<Input
										id="contactEmail"
										value={config.contact.email}
										onChange={(e) =>
											updateConfig("contact", { email: e.target.value })
										}
									/>
								</div>
							</div>

							<div className="flex items-center space-x-2">
								<Switch
									id="contactShowMap"
									checked={config.contact.showMap}
									onCheckedChange={(checked) =>
										updateConfig("contact", { showMap: checked })
									}
								/>
								<Label htmlFor="contactShowMap">Show Map</Label>
							</div>

							{config.contact.showMap && (
								<div className="space-y-2">
									<Label htmlFor="contactMapLocation">Map Location</Label>
									<Input
										id="contactMapLocation"
										value={config.contact.mapLocation}
										onChange={(e) =>
											updateConfig("contact", { mapLocation: e.target.value })
										}
										placeholder="Enter address or place name (e.g., 123 Main St, New York, NY)"
									/>
									<div className="border rounded-md overflow-hidden">
										{config.contact.mapLocation ? (
											<iframe
												width="100%"
												height="200"
												style={{ border: 0 }}
												loading="lazy"
												allowFullScreen
												referrerPolicy="no-referrer-when-downgrade"
												src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${encodeURIComponent(config.contact.mapLocation)}`}
											/>
										) : (
											<div className="h-48 bg-gray-100 flex items-center justify-center">
												<div className="text-center">
													<p className="text-sm text-gray-500">
														Enter a location above to see the map
													</p>
													<p className="text-xs text-gray-400 mt-1">
														Example: "123 Main St, New York, NY" or "Central Park"
													</p>
												</div>
											</div>
										)}
									</div>
									{config.contact.mapLocation && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
										<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
											<p className="text-sm text-yellow-800">
												<strong>Note:</strong> To display the map, you need to set up a Google Maps API key.
												Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment variables.
											</p>
										</div>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Footer Section */}
				<TabsContent value="footer" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Footer Section</CardTitle>
							<CardDescription>
								Configure the footer of your home page
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="footerCompanyName">Company Name</Label>
									<Input
										id="footerCompanyName"
										value={config.footer.companyName}
										onChange={(e) =>
											updateConfig("footer", { companyName: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="footerTagline">Tagline</Label>
									<Input
										id="footerTagline"
										value={config.footer.tagline}
										onChange={(e) =>
											updateConfig("footer", { tagline: e.target.value })
										}
									/>
								</div>
							</div>

							{/* <div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label>Quick Links</Label>
									<Button variant="outline" size="sm" onClick={addQuickLink}>
										<Plus className="h-4 w-4 mr-2" />
										Add Link
									</Button>
								</div>
								<div className="space-y-2">
									{config.footer.quickLinks.map((link, index) => (
										<div key={index} className="flex items-center space-x-2">
											<Input
												value={link}
												onChange={(e) => updateQuickLink(index, e.target.value)}
												placeholder="Link text"
											/>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => removeQuickLink(index)}>
												<Trash className="h-4 w-4 text-red-500" />
											</Button>
										</div>
									))}
								</div>
							</div> */}

							<div className="flex items-center space-x-2">
								<Switch
									id="footerShowSocial"
									checked={config.footer.showSocial}
									onCheckedChange={(checked) =>
										updateConfig("footer", { showSocial: checked })
									}
								/>
								<Label htmlFor="footerShowSocial">
									Show Social Media Links
								</Label>
							</div>

							{config.footer.showSocial && (
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="footerFacebook">Facebook URL</Label>
										<Input
											id="footerFacebook"
											value={config.footer.socialLinks.facebook}
											onChange={(e) =>
												updateConfig("footer", {
													socialLinks: {
														...config.footer.socialLinks,
														facebook: e.target.value,
													},
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="footerInstagram">Instagram URL</Label>
										<Input
											id="footerInstagram"
											value={config.footer.socialLinks.instagram}
											onChange={(e) =>
												updateConfig("footer", {
													socialLinks: {
														...config.footer.socialLinks,
														instagram: e.target.value,
													},
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="footerTwitter">Twitter URL</Label>
										<Input
											id="footerTwitter"
											value={config.footer.socialLinks.twitter}
											onChange={(e) =>
												updateConfig("footer", {
													socialLinks: {
														...config.footer.socialLinks,
														twitter: e.target.value,
													},
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="footerYoutube">YouTube URL</Label>
										<Input
											id="footerYoutube"
											value={config.footer.socialLinks.youtube}
											onChange={(e) =>
												updateConfig("footer", {
													socialLinks: {
														...config.footer.socialLinks,
														youtube: e.target.value,
													},
												})
											}
										/>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Hidden file input for image uploads */}
			<input
				type="file"
				ref={fileInputRef}
				className="hidden"
				accept="image/*"
				onChange={handleFileSelect}
			/>
		</div>
	);
}
