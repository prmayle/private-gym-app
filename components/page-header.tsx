"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserDropdown } from "@/components/ui/user-dropdown";
import { ArrowLeft, Plus, LucideIcon, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";

interface PageHeaderProps {
	title: string;
	subtitle: string;
	icon: LucideIcon;
	hasAddButton?: boolean;
	addLink?: string;
}

export function PageHeader({
	title,
	subtitle,
	icon: Icon,
	hasAddButton = false,
	addLink = "",
}: PageHeaderProps) {
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			
			// Show header when scrolling up or at the top
			if (currentScrollY < lastScrollY || currentScrollY < 10) {
				setIsVisible(true);
			} 
			// Hide header when scrolling down (but not at the very top)
			else if (currentScrollY > lastScrollY && currentScrollY > 100) {
				setIsVisible(false);
			}
			
			setLastScrollY(currentScrollY);
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, [lastScrollY]);

	// Simple theme toggle function
	const toggleTheme = () => {
		const newTheme = theme === "light" ? "dark" : "light";
		localStorage.setItem("core-factory-theme", newTheme);
		setTheme(newTheme);
	};

	return (
        <>
            <div style={{marginBottom: '60px'}}></div>

		<div 
			className={`fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40 shadow-sm rounded-b-xl transition-transform duration-300 ease-in-out ${
				isVisible ? 'translate-y-0' : '-translate-y-full'
			}`}
            style={{margin: '0',borderBottomLeftRadius:'20px',borderBottomRightRadius:'20px', boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',}}
		>
			<div className="px-4 sm:px-6">
				<div className="flex items-center justify-between gap-3 py-3">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => router.push("/admin/dashboard")}
							className="flex items-center gap-1 hover:bg-muted/50 transition-colors shrink-0">
							<ArrowLeft className="h-4 w-4" />
							<span className="hidden sm:inline text-sm">Back</span>
						</Button>
						
						<div className="flex items-center gap-2 min-w-0">
							<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
								<Icon className="w-4 h-4 text-primary" />
							</div>
							<div className="min-w-0">
								<h1 className="font-semibold text-lg text-foreground truncate">
									{title}
								</h1>
								<p className="text-xs text-muted-foreground truncate hidden sm:block">
									{subtitle}
								</p>
								
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{hasAddButton && addLink && (
							<Button asChild size="sm" className="shadow-sm">
								<Link href={addLink} className="flex items-center gap-1">
									<Plus className="h-4 w-4" />
									<span className="hidden sm:inline text-sm">Add</span>
								</Link>
							</Button>
						)}
						<Button 
							variant="ghost" 
							size="icon" 
							onClick={toggleTheme}
							className="h-9 w-9 hover:bg-primary/10 transition-colors rounded-xl"
						>
							{theme === "light" ? (
								<Sun className="h-4 w-4" />
							) : (
								<Moon className="h-4 w-4" />
							)}
							<span className="sr-only">Toggle theme</span>
						</Button>
						<UserDropdown />
					</div>
				</div>
			</div>
		</div>
        </>

	);
}
