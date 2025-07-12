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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, Plus, Trash, Upload } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Type definitions for home page configuration
interface HeroConfig {
	title: string;
	subtitle: string;
	showButton: boolean;
	buttonText: string;
	buttonLink: string;
	backgroundImage: string;
}

interface AboutConfig {
	title: string;
	content: string;
	showImage: boolean;
	image: string;
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

interface HomePageConfig {
	hero: HeroConfig;
	about: AboutConfig;
	features: FeaturesConfig;
	testimonials: TestimonialsConfig;
	contact: ContactConfig;
	footer: FooterConfig;
}

export default function HomeConfigPage() {
	const { toast } = useToast();
	const [config, setConfig] = useState<HomePageConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState("hero");
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Load data once on mount
	useEffect(() => {
		loadHomeConfig();

		// Set up real-time subscription
		const supabase = createClient();
		const channel = supabase
			.channel("home-config-changes")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "page_sections",
				},
				() => {
					loadHomeConfig();
				}
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "features",
				},
				() => {
					loadHomeConfig();
				}
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "testimonials",
				},
				() => {
					loadHomeConfig();
				}
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
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

			// Load page sections, features, and testimonials in parallel
			const [sectionsResult, featuresResult, testimonialsResult] =
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
				]);

			// Build config object
			const configData: any = {};

			// Process sections
			if (sectionsResult.data) {
				for (const section of sectionsResult.data) {
					const sectionName = section.sections?.[0]?.name;
					if (sectionName && section.content_data) {
						configData[sectionName] = section.content_data;
					}
				}
			}

			// Process features
			if (featuresResult.data) {
				const featuresSection = configData.features || {};
				configData.features = {
					title: featuresSection.title || "Our Services",
					subtitle: featuresSection.subtitle || "Discover what we offer",
					features: featuresResult.data.map((f) => ({
						id: f.id,
						title: f.title,
						description: f.description,
						icon: f.icon,
					})),
				};
			}

			// Process testimonials
			if (testimonialsResult.data) {
				const testimonialsSection = configData.testimonials || {};
				configData.testimonials = {
					title: testimonialsSection.title || "What Our Members Say",
					subtitle:
						testimonialsSection.subtitle ||
						"Success stories from our community",
					testimonials: testimonialsResult.data.map((t) => ({
						id: t.id,
						name: t.name,
						role: t.role,
						content: t.content,
						image:
							t.image_url || "/uploads/home-config/placeholder-testimonial.jpg",
					})),
				};
			}

			// Set default config structure
			setConfig({
				hero: configData.hero || {
					title: "Transform Your Body, Transform Your Life",
					subtitle:
						"Join our state-of-the-art gym and achieve your fitness goals with expert trainers and top-notch equipment.",
					showButton: true,
					buttonText: "Start Your Journey",
					buttonLink: "/member/dashboard",
					backgroundImage: "/uploads/home-config/hero-bg.jpg",
				},
				about: configData.about || {
					title: "About Our Gym",
					content:
						"We are dedicated to helping you achieve your fitness goals in a supportive and motivating environment.",
					showImage: true,
					image: "/uploads/home-config/about-image.jpg",
					bulletPoints: [
						"Expert Trainers",
						"Modern Equipment",
						"Flexible Hours",
					],
				},
				features: configData.features || {
					title: "Our Services",
					subtitle: "Everything you need for your fitness journey",
					features: [],
				},
				testimonials: configData.testimonials || {
					title: "What Our Members Say",
					subtitle: "Success stories from our community",
					testimonials: [],
				},
				contact: configData.contact || {
					title: "Get In Touch",
					subtitle: "Ready to start your fitness journey?",
					address: "123 Fitness Street, Gym City, GC 12345",
					phone: "(555) 123-4567",
					email: "info@yourgym.com",
					showMap: true,
					mapLocation: "123 Fitness Street, Gym City, GC 12345",
				},
				footer: {
					companyName: configData.footer?.companyName || "Your Gym",
					tagline: configData.footer?.tagline || "Transform Your Life",
					showSocial: configData.footer?.showSocial ?? true,
					socialLinks: {
						facebook:
							configData.footer?.socialLinks?.facebook ||
							"https://facebook.com/yourgym",
						instagram:
							configData.footer?.socialLinks?.instagram ||
							"https://instagram.com/yourgym",
						twitter:
							configData.footer?.socialLinks?.twitter ||
							"https://twitter.com/yourgym",
						youtube:
							configData.footer?.socialLinks?.youtube ||
							"https://youtube.com/yourgym",
					},
					quickLinks: configData.footer?.quickLinks || [
						"About",
						"Services",
						"Contact",
						"Membership",
					],
				},
			});
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
			let { data: section } = await supabase
				.from("sections")
				.select("id")
				.eq("name", sectionName)
				.single();

			if (!section) {
				const { data: newSection } = await supabase
					.from("sections")
					.insert({
						name: sectionName,
						display_name:
							sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
						is_active: true,
					})
					.select("id")
					.single();
				section = newSection;
			}

			if (!section) throw new Error("Could not create section");

			// Define sort order for each section
			const sortOrders: { [key: string]: number } = {
				hero: 0,
				about: 1,
				features: 2,
				testimonials: 3,
				contact: 4,
				footer: 5,
			};

			// Check if page_section already exists
			const { data: existingPageSection } = await supabase
				.from("page_sections")
				.select("id")
				.eq("page_id", homePage.id)
				.eq("section_id", section.id)
				.single();

			if (existingPageSection) {
				// Update existing page section
				await supabase
					.from("page_sections")
					.update({
						content_data: sectionData,
						is_enabled: true,
						sort_order: sortOrders[sectionName] || 0,
						updated_at: new Date().toISOString(),
					})
					.eq("id", existingPageSection.id);
			} else {
				// Insert new page section
				await supabase.from("page_sections").insert({
					page_id: homePage.id,
					section_id: section.id,
					content_data: sectionData,
					is_enabled: true,
					sort_order: sortOrders[sectionName] || 0,
				});
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
			image: "/uploads/home-config/placeholder-testimonial.jpg",
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

	const saveAllSettings = async () => {
		if (saving || !config) return;

		try {
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

			// Save all sections (hero, about, contact, footer) with unique sort orders
			const sectionsToSave = [
				{ name: "hero", order: 0 },
				{ name: "about", order: 1 },
				{ name: "contact", order: 4 },
				{ name: "footer", order: 5 },
			];
			const sectionPromises = sectionsToSave.map(async (sectionInfo) => {
				// Get or create section
				let { data: section } = await supabase
					.from("sections")
					.select("id")
					.eq("name", sectionInfo.name)
					.single();

				if (!section) {
					const { data: newSection } = await supabase
						.from("sections")
						.insert({
							name: sectionInfo.name,
							display_name:
								sectionInfo.name.charAt(0).toUpperCase() +
								sectionInfo.name.slice(1),
							is_active: true,
						})
						.select("id")
						.single();
					section = newSection;
				}

				if (!section)
					throw new Error(`Could not create ${sectionInfo.name} section`);

				// Check if page_section already exists
				const { data: existingPageSection } = await supabase
					.from("page_sections")
					.select("id")
					.eq("page_id", homePage.id)
					.eq("section_id", section.id)
					.single();

				if (existingPageSection) {
					// Update existing page section
					return supabase
						.from("page_sections")
						.update({
							content_data: config[sectionInfo.name as keyof HomePageConfig],
							is_enabled: true,
							sort_order: sectionInfo.order,
							updated_at: new Date().toISOString(),
						})
						.eq("id", existingPageSection.id);
				} else {
					// Insert new page section
					return supabase.from("page_sections").insert({
						page_id: homePage.id,
						section_id: section.id,
						content_data: config[sectionInfo.name as keyof HomePageConfig],
						is_enabled: true,
						sort_order: sectionInfo.order,
					});
				}
			});

			// Save features section headers
			let { data: featuresSection } = await supabase
				.from("sections")
				.select("id")
				.eq("name", "features")
				.single();

			if (!featuresSection) {
				const { data: newSection } = await supabase
					.from("sections")
					.insert({
						name: "features",
						display_name: "Features",
						is_active: true,
					})
					.select("id")
					.single();
				featuresSection = newSection;
			}

			if (featuresSection) {
				// Check if features page_section already exists
				const { data: existingFeaturesPageSection } = await supabase
					.from("page_sections")
					.select("id")
					.eq("page_id", homePage.id)
					.eq("section_id", featuresSection.id)
					.single();

				if (existingFeaturesPageSection) {
					// Update existing features page section
					await supabase
						.from("page_sections")
						.update({
							content_data: {
								title: config.features.title,
								subtitle: config.features.subtitle,
							},
							is_enabled: true,
							sort_order: 2,
							updated_at: new Date().toISOString(),
						})
						.eq("id", existingFeaturesPageSection.id);
				} else {
					// Insert new features page section
					await supabase.from("page_sections").insert({
						page_id: homePage.id,
						section_id: featuresSection.id,
						content_data: {
							title: config.features.title,
							subtitle: config.features.subtitle,
						},
						is_enabled: true,
						sort_order: 2,
					});
				}
			}

			// Save testimonials section headers
			let { data: testimonialsSection } = await supabase
				.from("sections")
				.select("id")
				.eq("name", "testimonials")
				.single();

			if (!testimonialsSection) {
				const { data: newSection } = await supabase
					.from("sections")
					.insert({
						name: "testimonials",
						display_name: "Testimonials",
						is_active: true,
					})
					.select("id")
					.single();
				testimonialsSection = newSection;
			}

			if (testimonialsSection) {
				// Check if testimonials page_section already exists
				const { data: existingTestimonialsPageSection } = await supabase
					.from("page_sections")
					.select("id")
					.eq("page_id", homePage.id)
					.eq("section_id", testimonialsSection.id)
					.single();

				if (existingTestimonialsPageSection) {
					// Update existing testimonials page section
					await supabase
						.from("page_sections")
						.update({
							content_data: {
								title: config.testimonials.title,
								subtitle: config.testimonials.subtitle,
							},
							is_enabled: true,
							sort_order: 3,
							updated_at: new Date().toISOString(),
						})
						.eq("id", existingTestimonialsPageSection.id);
				} else {
					// Insert new testimonials page section
					await supabase.from("page_sections").insert({
						page_id: homePage.id,
						section_id: testimonialsSection.id,
						content_data: {
							title: config.testimonials.title,
							subtitle: config.testimonials.subtitle,
						},
						is_enabled: true,
						sort_order: 3,
					});
				}
			}

			// Save all features
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

			// Save all testimonials
			const testimonialPromises = config.testimonials.testimonials.map(
				async (testimonial) => {
					return supabase.from("testimonials").upsert({
						id: testimonial.id.startsWith("new-") ? undefined : testimonial.id,
						name: testimonial.name,
						role: testimonial.role,
						content: testimonial.content,
						image_url: testimonial.image,
						is_active: true,
						updated_at: new Date().toISOString(),
					});
				}
			);

			// Execute all promises
			await Promise.all([
				...sectionPromises,
				...featurePromises,
				...testimonialPromises,
			]);

			// Reload config to get updated data
			await loadHomeConfig();

			toast({
				title: "Success",
				description: "All settings saved successfully",
			});
		} catch (error) {
			console.error("Save all error:", error);
			toast({
				title: "Error",
				description: "Failed to save settings",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	// Handle image upload
	const handleImageUpload = async (section: string, field: string) => {
		if (fileInputRef.current) {
			// Store the section and field for when file is selected
			fileInputRef.current.dataset.section = section;
			fileInputRef.current.dataset.field = field;
			fileInputRef.current.click();
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

		try {
			const supabase = createClient();

			// Create a unique filename
			const fileExt = file.name.split(".").pop();
			const fileName = `${section}-${field}-${Date.now()}.${fileExt}`;
			const filePath = `home-config/${fileName}`;

			// Upload file to Supabase Storage
			const { data, error } = await supabase.storage
				.from("uploads")
				.upload(filePath, file);

			if (error) throw error;

			// Get public URL
			const {
				data: { publicUrl },
			} = supabase.storage.from("uploads").getPublicUrl(filePath);

			// Update config with new image URL
			if (section === "hero" && field === "backgroundImage") {
				updateConfig("hero", { backgroundImage: publicUrl });
			} else if (section === "about" && field === "image") {
				updateConfig("about", { image: publicUrl });
			} else if (section === "testimonial" && field?.startsWith("image-")) {
				const testimonialId = field.split("-")[1];
				const testimonialIndex = config!.testimonials.testimonials.findIndex(
					(t) => t.id === testimonialId
				);
				if (testimonialIndex !== -1) {
					updateTestimonial(testimonialIndex, "image", publicUrl);
				}
			}

			toast({
				title: "Success",
				description: "Image uploaded successfully",
			});
		} catch (error) {
			console.error("Upload error:", error);
			toast({
				title: "Error",
				description: "Failed to upload image",
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
		<div className="container mx-auto py-6 space-y-6">
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
				<TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
					<TabsTrigger value="hero">Hero</TabsTrigger>
					<TabsTrigger value="about">About</TabsTrigger>
					<TabsTrigger value="features">Services</TabsTrigger>
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
						<CardContent className="space-y-4">
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

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="heroBackground">Background Image</Label>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											handleImageUpload("hero", "backgroundImage")
										}>
										<Upload className="h-4 w-4 mr-2" />
										Upload
									</Button>
								</div>
								<div className="border rounded-md p-2">
									<img
										src={config.hero.backgroundImage || "/placeholder.svg"}
										alt="Hero Background"
										className="w-full h-40 object-cover rounded-md"
									/>
								</div>
							</div>

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
						<CardContent className="space-y-4">
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

							<div className="space-y-2">
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

							<div className="flex items-center space-x-2">
								<Switch
									id="aboutShowImage"
									checked={config.about.showImage}
									onCheckedChange={(checked) =>
										updateConfig("about", { showImage: checked })
									}
								/>
								<Label htmlFor="aboutShowImage">Show Image</Label>
							</div>

							{config.about.showImage && (
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<Label htmlFor="aboutImage">Image</Label>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleImageUpload("about", "image")}>
											<Upload className="h-4 w-4 mr-2" />
											Upload
										</Button>
									</div>
									<div className="border rounded-md p-2">
										<img
											src={config.about.image || "/placeholder.svg"}
											alt="About Section"
											className="w-full h-40 object-cover rounded-md"
										/>
									</div>
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
																	/>
																	<Button
																		variant="outline"
																		size="icon"
																		className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full"
																		onClick={() =>
																			handleImageUpload(
																				"testimonial",
																				`image-${testimonial.id}`
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
									<Input
										id="contactPhone"
										value={config.contact.phone}
										onChange={(e) =>
											updateConfig("contact", { phone: e.target.value })
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
									/>
									<div className="border rounded-md p-2 bg-gray-100 h-40 flex items-center justify-center">
										<p className="text-sm text-gray-500">
											Map Preview (Google Maps integration would be implemented
											here)
										</p>
									</div>
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

							<div className="space-y-2">
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
							</div>

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
