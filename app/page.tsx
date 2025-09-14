"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Apple,
	Dumbbell,
	Facebook,
	Heart,
	Instagram,
	MapPin,
	Phone,
	Star,
	Twitter,
	Youtube,
	Mail,
	Users,
	Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
	getHomePageConfig,
	getSliderImages,
	type TypedSupabaseClient,
} from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { UserDropdown } from "@/components/ui/user-dropdown";
import { ImageSlider } from "@/components/ui/image-slider";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Import WhatsApp icon
const WhatsAppIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="currentColor"
		className="h-5 w-5">
		<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
	</svg>
);

// Default fallback data
const defaultHomeConfig = {
	hero: {
		title: "Welcome to Core Factory",
		subtitle: "Your journey to a healthier lifestyle starts here",
		showButton: true,
		buttonText: "Join Now",
		buttonLink:
			"https://wa.me/15551234567?text=Hi%2C%20I%27m%20interested%20in%20joining%20Core%20Factory",
	},
	about: {
		title: "Our Mission",
		content:
			"At Core Factory, we believe in personalized fitness journeys. Our private gym offers exclusive training sessions, expert coaches, and a supportive community to help you achieve your fitness goals.",
		showImage: true,
		bulletPoints: [
			"Premium Equipment",
			"Expert Trainers",
			"Flexible Scheduling",
			"Proven Results",
		],
	},
	features: {
		title: "Our Services",
		subtitle: "Discover what we offer",
		features: [
			{
				id: "default-feature-1",
				title: "Personal Training",
				description: "One-on-one sessions with expert trainers",
				icon: "dumbbell",
			},
			{
				id: "default-feature-2",
				title: "Group Classes",
				description: "Motivating group workouts for all levels",
				icon: "users",
			},
			{
				id: "default-feature-3",
				title: "Nutrition Planning",
				description: "Customized meal plans for your goals",
				icon: "apple",
			},
		],
	},
	trainers: {
		title: "Our Expert Trainers",
		subtitle: "Meet the professionals who will guide your fitness journey",
		trainers: [],
	},
	testimonials: {
		title: "What Our Members Say",
		subtitle: "Success stories from our community",
		testimonials: [
			{
				id: "default-testimonial-1",
				name: "Sarah Johnson",
				role: "Member since 2021",
				content:
					"Core Factory changed my life. The trainers are exceptional and the community is so supportive.",
				image: "/placeholder.svg?height=100&width=100",
			},
			{
				id: "default-testimonial-2",
				name: "Michael Chen",
				role: "Member since 2022",
				content:
					"I've tried many gyms, but none compare to the personalized experience at Core Factory.",
				image: "/placeholder.svg?height=100&width=100",
			},
		],
	},
	contact: {
		title: "Get In Touch",
		subtitle: "We're here to help you on your fitness journey",
		address: "123 Fitness Street, Gym City, GC 12345",
		phone: "+1 (555) 123-4567",
		email: "info@corefactory.com",
		showMap: true,
		mapLocation: "40.7128,-74.0060",
	},
	footer: {
		companyName: "Core Factory",
		tagline: "Building stronger bodies and minds",
		showSocial: true,
		socialLinks: {
			facebook: "https://facebook.com/corefactory",
			instagram: "https://instagram.com/corefactory",
			twitter: "",
			youtube: "",
		},
		copyrightText: `© ${new Date().getFullYear()} Core Factory. All rights reserved.`,
	},
};

// Helper function to render icon based on name
const renderIcon = (iconName: string, className = "h-6 w-6") => {
	switch (iconName) {
		case "dumbbell":
			return <Dumbbell className={className} />;
		case "users":
			return <Users className={className} />;
		case "apple":
			return <Apple className={className} />;
		case "heart":
			return <Heart className={className} />;
		case "star":
			return <Star className={className} />;
		default:
			return <Star className={className} />;
	}
};

export default function Home() {
	const [homeConfig, setHomeConfig] = useState(defaultHomeConfig);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [heroSliderImages, setHeroSliderImages] = useState<any[]>([]);
	const [aboutSliderImages, setAboutSliderImages] = useState<any[]>([]);
	const { user, loading: authLoading } = useAuth();

	useEffect(() => {
		// Load config in background without blocking render
		loadHomePageConfig().catch(console.error);
	}, []);

	const loadHomePageConfig = async () => {
		try {
			// Start with defaults immediately, then enhance with DB data
			setIsLoading(false); // Don't block rendering
			setError(null);

			const supabase = createClient();
			// Add timeout to prevent hanging
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(() => reject(new Error("Database timeout")), 5000)
			);

			const [data, heroSliderData, aboutSliderData] = await Promise.all([
				Promise.race([getHomePageConfig(supabase), timeoutPromise]),
				getSliderImages(supabase, "hero").catch(() => []),
				getSliderImages(supabase, "about").catch(() => []),
			]);

			// Set slider images
			if (heroSliderData.length > 0) {
				setHeroSliderImages(
					heroSliderData.map((img) => ({
						id: img.id,
						imageUrl: img.image_url,
						title: img.title,
						subtitle: img.subtitle,
						sortOrder: img.sort_order,
					}))
				);
			}

			if (aboutSliderData.length > 0) {
				setAboutSliderImages(
					aboutSliderData.map((img) => ({
						id: img.id,
						imageUrl: img.image_url,
						title: img.title,
						subtitle: img.subtitle,
						sortOrder: img.sort_order,
					}))
				);
			}

			if (data) {
				// Merge database config with defaults
				const mergedConfig = {
					hero: { ...defaultHomeConfig.hero, ...(data.hero || {}) },
					about: { ...defaultHomeConfig.about, ...(data.about || {}) },
					features: {
						title: data.features?.title || defaultHomeConfig.features.title,
						subtitle:
							data.features?.subtitle || defaultHomeConfig.features.subtitle,
						features:
							data.features?.features || defaultHomeConfig.features.features,
					},
					trainers: {
						title: data.trainers?.title || defaultHomeConfig.trainers.title,
						subtitle:
							data.trainers?.subtitle || defaultHomeConfig.trainers.subtitle,
						trainers:
							data.trainers?.trainers || defaultHomeConfig.trainers.trainers,
					},
					testimonials: {
						title:
							data.testimonials?.title || defaultHomeConfig.testimonials.title,
						subtitle:
							data.testimonials?.subtitle ||
							defaultHomeConfig.testimonials.subtitle,
						testimonials:
							data.testimonials?.testimonials ||
							defaultHomeConfig.testimonials.testimonials,
					},
					contact: { ...defaultHomeConfig.contact, ...(data.contact || {}) },
					footer: { ...defaultHomeConfig.footer, ...(data.footer || {}) },
				};
				setHomeConfig(mergedConfig);
			}
		} catch (err) {
			// Don't set error, just use defaults
			console.warn(
				"Failed to load page config, using defaults:",
				err instanceof Error ? err.message : "Unknown error"
			);
		}
	};

	// Slick slider settings for mobile
	const sliderSettings = {
	dots: true,
	infinite: true,
	speed: 500,
	slidesToShow: 1,
	slidesToScroll: 1,
	autoplay: true,
	autoplaySpeed: 4000,
	pauseOnHover: true,
	arrows: false,
	adaptiveHeight: true,
	draggable: true,
	swipeToSlide: true,
};

	// Remove blocking loading screen - let page render with defaults
	// if (isLoading) {
	// 	return (
	// 		<div className="min-h-screen bg-background flex items-center justify-center">
	// 			<div className="text-center">
	// 				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
	// 				<p className="text-foreground/70">Loading...</p>
	// 			</div>
	// 		</div>
	// 	);
	// }

	if (error) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<p className="text-destructive mb-4">{error}</p>
					<Button onClick={loadHomePageConfig}>Retry</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Navigation */}
			<nav className="bg-card/50 backdrop-blur-sm fixed w-full z-10">
				<div className="container mx-auto max-w-7xl px-4 py-3 flex justify-between items-center">
					<div className="text-xl font-bold text-primary">
						{homeConfig.footer.companyName}
					</div>
					<div className="flex items-center gap-4">
						{user ? (
							<UserDropdown />
						) : (
							<Button variant="ghost" asChild>
								<Link href="/login">Login</Link>
							</Button>
						)}
						<Button 
							asChild
							className="bg-[#25D366] hover:bg-[#20BA5A] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
						>
							<a
								href={homeConfig.hero.buttonLink}
								target="_blank"
								rel="noopener noreferrer">
								<WhatsAppIcon />
								<span className="ml-2">{homeConfig.hero.buttonText}</span>
							</a>
						</Button>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="pt-16 relative min-h-[70vh] flex items-center justify-center text-center">
				{/* Background Slider */}
				<div className="absolute inset-0 z-0">
					{heroSliderImages.length > 0 ? (
						<ImageSlider
							images={heroSliderImages}
							className="w-full h-full"
							showControls={true}
							showIndicators={true}
							autoPlay={true}
							interval={6000}
						/>
					) : (
						<div
							className="w-full h-full bg-cover bg-center bg-gradient-to-r from-primary/20 to-primary/40"
							style={{
								backgroundImage: `url(/placeholder.svg?height=600&width=1200)`,
							}}
						/>
					)}
					{/* Dark Overlay */}
					<div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70 z-10" />
				</div>

				{/* Content */}
				<div className="container mx-auto max-w-7xl px-4 relative z-20">
					<div className="max-w-3xl mx-auto text-center">
						<h1 className="text-3xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg">
							{homeConfig.hero.title}
						</h1>
						<p className="text-xl md:text-2xl mb-8 text-white/90 drop-shadow-md">
							{homeConfig.hero.subtitle}
						</p>
						{homeConfig.hero.showButton && (
							<Button 
								size="lg" 
								asChild 
								className="bg-[#25D366] hover:bg-[#20BA5A] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
							>
								<a
									href={homeConfig.hero.buttonLink}
									target="_blank"
									rel="noopener noreferrer">
									<WhatsAppIcon />
									<span className="ml-2">{homeConfig.hero.buttonText}</span>
								</a>
							</Button>
						)}
					</div>
				</div>
			</section>

			{/* About Section */}
			<section className="py-20 bg-gradient-to-br from-primary/5 via-background to-primary/5 relative overflow-hidden">
				{/* Background Elements */}
				<div className="absolute top-0 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
				<div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl"></div>
				
				<div className="container mx-auto max-w-7xl px-4 relative z-10">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
						{homeConfig.about.showImage && (
							<div className="order-2 md:order-1">
								{aboutSliderImages.length > 0 ? (
									<div className="relative group">
										<div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
										<ImageSlider
											images={aboutSliderImages}
											className="rounded-2xl shadow-2xl w-full h-64 md:h-80 relative z-10"
											showControls={true}
											showIndicators={true}
											autoPlay={true}
											interval={7000}
										/>
									</div>
								) : (
									<div className="relative group">
										<div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
										<div className="rounded-2xl shadow-2xl w-full h-64 md:h-80 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center relative z-10 border border-border/50">
											<div className="text-center text-muted-foreground">
												<div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
													<Star className="h-8 w-8 text-primary" />
												</div>
												<p className="text-lg font-medium mb-2">
													No images available
												</p>
												<p className="text-sm">Add images in the admin panel</p>
											</div>
										</div>
									</div>
								)}
							</div>
						)}
						<div
							className={`order-1 ${
								homeConfig.about.showImage ? "md:order-2" : ""
							}`}>
							<div className="max-w-2xl">
								<div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
									<Heart className="h-4 w-4 text-primary" />
									<span className="text-sm font-medium text-primary">Our Mission</span>
								</div>
								<h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
									{homeConfig.about.title}
								</h2>
								<p className="text-lg text-foreground/80 leading-relaxed mb-8">
									{homeConfig.about.content}
								</p>
								<div className="space-y-4">
									{homeConfig.about.bulletPoints.map((point, index) => (
										<div key={index} className="flex items-center group">
											<div className="bg-gradient-to-br from-primary/20 to-primary/10 p-3 rounded-2xl mr-4 group-hover:scale-110 transition-transform duration-300">
												<Star className="h-5 w-5 text-primary" />
											</div>
											<span className="text-foreground/80 font-medium group-hover:text-foreground transition-colors duration-300">
												{point}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Services Section */}
			<section className="py-20 bg-gradient-to-br from-primary/5 via-background to-primary/5 relative">
				{/* Background Elements */}
				<div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
				<div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl"></div>
				
				<div className="container mx-auto max-w-7xl px-4 text-center relative z-10">
					<div className="max-w-3xl mx-auto mb-10">
						<div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
							<Zap className="h-4 w-4 text-primary" />
							<span className="text-sm font-medium text-primary">Our Services</span>
						</div>
						<h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
							{homeConfig.features.title}
						</h2>
						<p className="text-lg text-foreground/80 leading-relaxed">
							{homeConfig.features.subtitle}
						</p>
					</div>
					
					{/* Mobile Slider */}
					<div className="block md:hidden">
						<Slider {...sliderSettings}>
							{homeConfig.features.features.map((feature, index) => (
								<div key={feature.id || `feature-${index}`} className="px-2">
									<div className="bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl mx-2 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-border/50">
										<div className="bg-gradient-to-br from-primary/20 to-primary/10 p-4 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6">
											{renderIcon(feature.icon, "h-10 w-10 text-primary")}
										</div>
										<h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
										<p className="text-foreground/70 leading-relaxed">{feature.description}</p>
									</div>
								</div>
							))}
						</Slider>
					</div>

					{/* Desktop Grid */}
					<div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-8">
						{homeConfig.features.features.map((feature, index) => (
							<div key={feature.id || `feature-${index}`} className="group bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border border-border/50">
								<div className="bg-gradient-to-br from-primary/20 to-primary/10 p-4 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
									{renderIcon(feature.icon, "h-10 w-10 text-primary")}
								</div>
								<h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
								<p className="text-foreground/70 leading-relaxed">{feature.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Trainers Section */}
			<section className="py-0 bg-gradient-to-br from-background via-primary/5 to-background relative overflow-hidden">
				<div className="container mx-auto max-w-7xl px-4 text-center relative z-10">
					<div className="max-w-3xl mx-auto mb-10">
						<div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
							<Users className="h-4 w-4 text-primary" />
							<span className="text-sm font-medium text-primary">Our Expert Trainers</span>
						</div>
						<h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
							{homeConfig.trainers.title}
						</h2>
						<p className="text-lg text-foreground/80 leading-relaxed">
							{homeConfig.trainers.subtitle}
						</p>
					</div>
					{homeConfig.trainers.trainers.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
							{homeConfig.trainers.trainers
								.filter((trainer: any) => trainer.isAvailable)
								.map((trainer: any, index: number) => (
									<div
										key={trainer.id || `trainer-${index}`}
										className="group bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border border-border/50">
										<div className="relative mb-6">
											<div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
											<img
												src={trainer.profilePhotoUrl || "/placeholder.svg"}
												alt={trainer.name}
												className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-primary/20 group-hover:border-primary/40 transition-all duration-300 relative z-10"
												onError={(e) => {
													const target = e.target as HTMLImageElement;
													if (target.src !== "/placeholder.svg") {
														target.src = "/placeholder.svg";
													}
												}}
											/>
										</div>
										<h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors duration-300">{trainer.name}</h3>
										<p className="text-primary/80 font-medium mb-4">
											{trainer.specializations}
										</p>
										<p className="text-foreground/70 leading-relaxed">{trainer.bio}</p>
									</div>
								))}
						</div>
					) : (
						<div className="text-center py-0">
							<div className="bg-card/80 backdrop-blur-sm p-12 rounded-2xl shadow-xl max-w-md mx-auto border border-border/50">
								<div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
									<Users className="h-10 w-10 text-primary" />
								</div>
								<h3 className="text-2xl font-bold mb-4">No trainers available</h3>
								<p className="text-foreground/60 leading-relaxed">Check back soon for updates on our expert team!</p>
							</div>
						</div>
					)}
				</div>
			</section>

			{/* Testimonials Section */}
			<section className="py-20 bg-gradient-to-br from-primary/5 via-background to-primary/5 relative overflow-hidden">
				{/* Background Elements */}
				<div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-pulse"></div>
				<div className="absolute bottom-10 right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
				
				<div className="container mx-auto max-w-7xl px-4 text-center relative z-10">
					<div className="max-w-3xl mx-auto mb-10">
						<div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
							<Heart className="h-4 w-4 text-primary" />
							<span className="text-sm font-medium text-primary">Member Stories</span>
						</div>
						<h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
							{homeConfig.testimonials.title}
						</h2>
						<p className="text-lg text-foreground/80 leading-relaxed">
							{homeConfig.testimonials.subtitle}
						</p>
					</div>
					
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{homeConfig.testimonials.testimonials.map((testimonial, index) => (
							<div
								key={testimonial.id || `testimonial-${index}`}
								className="group bg-card/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-border/50 relative overflow-hidden">
								
								{/* Decorative Quote */}
								<div className="absolute top-4 left-4 text-6xl text-primary/10 font-serif leading-none">"</div>
								<div className="absolute bottom-4 right-4 text-6xl text-primary/10 font-serif leading-none transform rotate-180">"</div>
								
								<div className="flex flex-col items-center relative z-10">
									{/* Profile Image with Glow Effect */}
									<div className="relative mb-6">
										<div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
										<img
											src={testimonial.image || "/placeholder.svg"}
											alt={testimonial.name}
											className="w-20 h-20 rounded-full object-cover border-4 border-primary/20 group-hover:border-primary/40 transition-all duration-300 relative z-10"
											onError={(e) => {
												const target = e.target as HTMLImageElement;
												if (target.src !== "/placeholder.svg") {
													target.src = "/placeholder.svg";
												}
											}}
										/>
									</div>
									
									{/* Testimonial Content */}
									<div className="text-center">
										<p className="italic text-lg mb-6 leading-relaxed text-foreground/80 relative">
											<span className="text-primary/60 text-2xl font-serif absolute -left-2 -top-2">"</span>
											{testimonial.content}
											<span className="text-primary/60 text-2xl font-serif absolute -right-2 -bottom-2">"</span>
										</p>
										
										{/* Author Info */}
										<div className="border-t border-border/30 pt-4">
											<p className="font-bold text-xl mb-1 group-hover:text-primary transition-colors duration-300">{testimonial.name}</p>
											<p className="text-primary/80 font-medium text-sm">
												{testimonial.role}
											</p>
										</div>
									</div>
								</div>
								
								{/* Hover Effect Overlay */}
								<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
							</div>
						))}
					</div>
					
					{/* Call to Action */}
					<div className="mt-16 text-center">
						<div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-full">
							<Star className="h-5 w-5 text-primary" />
							<span className="text-sm font-medium text-primary">Join our community of satisfied members</span>
						</div>
					</div>
				</div>
			</section>

			{/* Contact Section */}
			<section className="py-0 bg-gradient-to-br from-background via-primary/5 to-background relative overflow-hidden">
				<div className="container mx-auto max-w-7xl px-4 relative z-10">
					<div className="text-center mb-16">
						<div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
							<Mail className="h-4 w-4 text-primary" />
							<span className="text-sm font-medium text-primary">Get In Touch</span>
						</div>
						<h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
							{homeConfig.contact.title}
						</h2>
						<p className="text-lg text-foreground/80 max-w-2xl mx-auto leading-relaxed">{homeConfig.contact.subtitle}</p>
					</div>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-10">
						<div className="space-y-8">
							<div className="flex items-start p-6 bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl border border-border/50 hover:shadow-2xl transition-all duration-300">
								<div className="bg-gradient-to-br from-primary/20 to-primary/10 p-4 rounded-2xl mr-6">
									<MapPin className="h-6 w-6 text-primary" />
								</div>
								<div>
									<h3 className="font-bold text-xl mb-2">Address</h3>
									<p className="text-foreground/70 leading-relaxed">
										{homeConfig.contact.address}
									</p>
								</div>
							</div>
							<div className="flex items-start p-6 bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl border border-border/50 hover:shadow-2xl transition-all duration-300">
								<div className="bg-gradient-to-br from-primary/20 to-primary/10 p-4 rounded-2xl mr-6">
									<Phone className="h-6 w-6 text-primary" />
								</div>
								<div>
									<h3 className="font-bold text-xl mb-2">Phone</h3>
									<p className="text-foreground/70 leading-relaxed">
										{homeConfig.contact.phone}
									</p>
								</div>
							</div>
							<div className="flex items-start p-6 bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl border border-border/50 hover:shadow-2xl transition-all duration-300">
								<div className="bg-gradient-to-br from-primary/20 to-primary/10 p-4 rounded-2xl mr-6">
									<Mail className="h-6 w-6 text-primary" />
								</div>
								<div>
									<h3 className="font-bold text-xl mb-2">Email</h3>
									<p className="text-foreground/70 leading-relaxed">
										{homeConfig.contact.email}
									</p>
								</div>
							</div>
						</div>
						{homeConfig.contact.showMap && (
							<div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-border/50">
								{homeConfig.contact.mapLocation ? (
									<iframe
										width="100%"
										height="400"
										style={{ border: 0 }}
										loading="lazy"
										allowFullScreen
										referrerPolicy="no-referrer-when-downgrade"
										src={`https://www.google.com/maps/embed/v1/place?key=${
											process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
											"YOUR_API_KEY"
										}&q=${encodeURIComponent(homeConfig.contact.mapLocation)}`}
									/>
								) : (
									<div className="h-64 flex items-center justify-center">
										<div className="text-center">
											<MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
											<p className="text-foreground/50">No location configured</p>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-card py-12">
				<div className="container mx-auto max-w-7xl px-4">
					<div className="flex flex-col md:flex-row justify-between items-center mb-8">
						<div className="mb-6 md:mb-0">
							<h3 className="text-xl font-bold text-primary">
								{homeConfig.footer.companyName}
							</h3>
							<p className="text-foreground/70">{homeConfig.footer.tagline}</p>
						</div>
						{homeConfig.footer.showSocial && (
							<div className="flex space-x-4">
								{homeConfig.footer.socialLinks.facebook && (
									<a
										href={homeConfig.footer.socialLinks.facebook}
										target="_blank"
										rel="noopener noreferrer"
										className="bg-primary/10 p-2 rounded-full hover:bg-primary/20">
										<Facebook className="h-5 w-5 text-primary" />
									</a>
								)}
								{homeConfig.footer.socialLinks.instagram && (
									<a
										href={homeConfig.footer.socialLinks.instagram}
										target="_blank"
										rel="noopener noreferrer"
										className="bg-primary/10 p-2 rounded-full hover:bg-primary/20">
										<Instagram className="h-5 w-5 text-primary" />
									</a>
								)}
								{homeConfig.footer.socialLinks.twitter && (
									<a
										href={homeConfig.footer.socialLinks.twitter}
										target="_blank"
										rel="noopener noreferrer"
										className="bg-primary/10 p-2 rounded-full hover:bg-primary/20">
										<Twitter className="h-5 w-5 text-primary" />
									</a>
								)}
								{homeConfig.footer.socialLinks.youtube && (
									<a
										href={homeConfig.footer.socialLinks.youtube}
										target="_blank"
										rel="noopener noreferrer"
										className="bg-primary/10 p-2 rounded-full hover:bg-primary/20">
										<Youtube className="h-5 w-5 text-primary" />
									</a>
								)}
							</div>
						)}
					</div>
					<div className="border-t border-muted pt-8 text-center">
						<p className="text-sm text-foreground/60">
							{homeConfig.footer.copyrightText}
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
