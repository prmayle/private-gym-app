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
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { getHomePageConfig, type TypedSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { UserDropdown } from "@/components/ui/user-dropdown";

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
		backgroundImage: "/placeholder.svg?height=600&width=1200",
	},
	about: {
		title: "Our Mission",
		content:
			"At Core Factory, we believe in personalized fitness journeys. Our private gym offers exclusive training sessions, expert coaches, and a supportive community to help you achieve your fitness goals.",
		showImage: true,
		image: "/placeholder.svg?height=400&width=600",
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
				setTimeout(() => reject(new Error('Database timeout')), 5000)
			);
			
			const data = await Promise.race([
				getHomePageConfig(supabase),
				timeoutPromise
			]);

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
				<div className="container mx-auto px-4 py-3 flex justify-between items-center">
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
						<Button asChild>
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
			<section
				className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 flex items-center justify-center text-center"
				style={{
					backgroundImage: `linear-gradient(rgba(10, 10, 10, 0.7), rgba(10, 10, 10, 0.9)), url(${homeConfig.hero.backgroundImage})`,
					backgroundSize: "cover",
					backgroundPosition: "center",
				}}>
				<div className="container mx-auto max-w-3xl">
					<h1 className="text-3xl md:text-5xl font-bold mb-4 text-primary">
						{homeConfig.hero.title}
					</h1>
					<p className="text-xl md:text-2xl mb-8 text-foreground/80">
						{homeConfig.hero.subtitle}
					</p>
					{homeConfig.hero.showButton && (
						<Button size="lg" asChild>
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
			</section>

			{/* About Section */}
			<section className="py-16 px-4 bg-background">
				<div className="container mx-auto">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
						{homeConfig.about.showImage && (
							<div className="order-2 md:order-1">
								<img
									src={homeConfig.about.image || "/placeholder.svg"}
									alt="About Core Factory"
									className="rounded-lg shadow-lg w-full"
									onError={(e) => {
										const target = e.target as HTMLImageElement;
										if (target.src !== "/placeholder.svg") {
											target.src = "/placeholder.svg";
										}
									}}
								/>
							</div>
						)}
						<div
							className={`order-1 ${
								homeConfig.about.showImage ? "md:order-2" : ""
							}`}>
							<h2 className="text-2xl md:text-3xl font-bold mb-4 text-primary">
								{homeConfig.about.title}
							</h2>
							<p className="mb-6 text-foreground/80">
								{homeConfig.about.content}
							</p>
							<ul className="space-y-2">
								{homeConfig.about.bulletPoints.map((point, index) => (
									<li key={index} className="flex items-center">
										<span className="bg-primary/10 p-1 rounded-full mr-2">
											<Star className="h-4 w-4 text-primary" />
										</span>
										{point}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</section>

			{/* Services Section */}
			<section className="py-16 px-4 bg-card/30">
				<div className="container mx-auto text-center">
					<h2 className="text-2xl md:text-3xl font-bold mb-2 text-primary">
						{homeConfig.features.title}
					</h2>
					<p className="mb-12 text-foreground/80">
						{homeConfig.features.subtitle}
					</p>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{homeConfig.features.features.map((feature, index) => (
							<div
								key={feature.id || `feature-${index}`}
								className="bg-card p-6 rounded-lg shadow-md">
								<div className="bg-primary/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
									{renderIcon(feature.icon, "h-8 w-8 text-primary")}
								</div>
								<h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
								<p className="text-foreground/70">{feature.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Trainers Section */}
			<section className="py-16 px-4 bg-background">
				<div className="container mx-auto text-center">
					<h2 className="text-2xl md:text-3xl font-bold mb-2 text-primary">
						{homeConfig.trainers.title}
					</h2>
					<p className="mb-12 text-foreground/80">
						{homeConfig.trainers.subtitle}
					</p>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{homeConfig.trainers.trainers
							.filter((trainer) => trainer.isAvailable)
							.map((trainer, index) => (
								<div
									key={trainer.id || `trainer-${index}`}
									className="bg-card p-6 rounded-lg shadow-md flex flex-col items-center">
									<img
										src={trainer.profilePhotoUrl || "/placeholder.svg"}
										alt={trainer.name}
										className="w-32 h-32 rounded-full object-cover mb-4 border-2 border-primary"
										onError={(e) => {
											const target = e.target as HTMLImageElement;
											if (target.src !== "/placeholder.svg") {
												target.src = "/placeholder.svg";
											}
										}}
									/>
									<h3 className="text-xl font-semibold">{trainer.name}</h3>
									<p className="text-sm text-foreground/70 mb-3">
										{trainer.specializations}
									</p>
									<p className="text-foreground/80 text-sm">{trainer.bio}</p>
								</div>
							))}
					</div>
				</div>
			</section>

			{/* Testimonials Section */}
			<section className="py-16 px-4 bg-card/30">
				<div className="container mx-auto text-center">
					<h2 className="text-2xl md:text-3xl font-bold mb-2 text-primary">
						{homeConfig.testimonials.title}
					</h2>
					<p className="mb-12 text-foreground/80">
						{homeConfig.testimonials.subtitle}
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{homeConfig.testimonials.testimonials.map((testimonial, index) => (
							<div
								key={testimonial.id || `testimonial-${index}`}
								className="bg-card p-6 rounded-lg shadow-md">
								<div className="flex flex-col items-center">
									<img
										src={testimonial.image || "/placeholder.svg"}
										alt={testimonial.name}
										className="w-20 h-20 rounded-full object-cover mb-4"
										onError={(e) => {
											const target = e.target as HTMLImageElement;
											if (target.src !== "/placeholder.svg") {
												target.src = "/placeholder.svg";
											}
										}}
									/>
									<p className="italic mb-4">"{testimonial.content}"</p>
									<div>
										<p className="font-semibold">{testimonial.name}</p>
										<p className="text-sm text-foreground/70">
											{testimonial.role}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Contact Section */}
			<section className="py-16 px-4 bg-background">
				<div className="container mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-2xl md:text-3xl font-bold mb-2 text-primary">
							{homeConfig.contact.title}
						</h2>
						<p className="text-foreground/80">{homeConfig.contact.subtitle}</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div className="space-y-6">
							<div className="flex items-start">
								<div className="bg-primary/10 p-3 rounded-full mr-4">
									<MapPin className="h-6 w-6 text-primary" />
								</div>
								<div>
									<h3 className="font-semibold mb-1">Address</h3>
									<p className="text-foreground/70">
										{homeConfig.contact.address}
									</p>
								</div>
							</div>
							<div className="flex items-start">
								<div className="bg-primary/10 p-3 rounded-full mr-4">
									<Phone className="h-6 w-6 text-primary" />
								</div>
								<div>
									<h3 className="font-semibold mb-1">Phone</h3>
									<p className="text-foreground/70">
										{homeConfig.contact.phone}
									</p>
								</div>
							</div>
							<div className="flex items-start">
								<div className="bg-primary/10 p-3 rounded-full mr-4">
									<Mail className="h-6 w-6 text-primary" />
								</div>
								<div>
									<h3 className="font-semibold mb-1">Email</h3>
									<p className="text-foreground/70">
										{homeConfig.contact.email}
									</p>
								</div>
							</div>
						</div>
						{homeConfig.contact.showMap && (
							<div className="bg-card rounded-lg shadow-md overflow-hidden">
								{homeConfig.contact.mapLocation ? (
									<iframe
										width="100%"
										height="256"
										style={{ border: 0 }}
										loading="lazy"
										allowFullScreen
										referrerPolicy="no-referrer-when-downgrade"
										src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${encodeURIComponent(homeConfig.contact.mapLocation)}`}
									/>
								) : (
									<div className="h-64 flex items-center justify-center">
										<p className="text-foreground/50">
											No location configured
										</p>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-card py-12 px-4">
				<div className="container mx-auto">
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
