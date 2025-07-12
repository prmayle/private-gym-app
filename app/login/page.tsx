"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
	Eye,
	EyeOff,
	Lock,
	Mail,
	Info,
	UserPlus,
	LogIn,
	CheckCircle,
	AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Enhanced error message mapping for better user experience
const getErrorMessage = (
	error: any
): {
	title: string;
	description: string;
	variant: "default" | "destructive";
} => {
	if (!error)
		return {
			title: "Unknown Error",
			description: "An unexpected error occurred.",
			variant: "destructive",
		};

	const errorCode = error.code || error.error_code || "";
	const errorMessage = error.message || "";

	console.log("Supabase Error:", { code: errorCode, message: errorMessage });

	switch (errorCode) {
		case "invalid_credentials":
			return {
				title: "Invalid Credentials",
				description:
					"The email or password you entered is incorrect. Please check your credentials and try again.",
				variant: "destructive",
			};

		case "email_not_confirmed":
			return {
				title: "Email Not Verified",
				description:
					"Please check your email and click the verification link before signing in.",
				variant: "destructive",
			};

		case "user_not_found":
			return {
				title: "Account Not Found",
				description:
					"No account found with this email address. Please check your email or sign up for a new account.",
				variant: "destructive",
			};

		case "signup_disabled":
			return {
				title: "Registration Disabled",
				description:
					"New user registration is currently disabled. Please contact an administrator.",
				variant: "destructive",
			};

		case "email_address_invalid":
			return {
				title: "Invalid Email",
				description: "Please enter a valid email address.",
				variant: "destructive",
			};

		case "password_too_short":
			return {
				title: "Password Too Short",
				description: "Password must be at least 8 characters long.",
				variant: "destructive",
			};

		case "weak_password":
			return {
				title: "Weak Password",
				description:
					"Please choose a stronger password with a mix of letters, numbers, and special characters.",
				variant: "destructive",
			};

		case "user_already_registered":
		case "email_address_not_authorized":
			return {
				title: "Email Already Registered",
				description:
					"An account with this email already exists. Please sign in instead or use a different email.",
				variant: "destructive",
			};

		case "rate_limit_exceeded":
			return {
				title: "Too Many Attempts",
				description:
					"Too many attempts. Please wait a few minutes before trying again.",
				variant: "destructive",
			};

		case "network_error":
			return {
				title: "Connection Error",
				description:
					"Unable to connect to the server. Please check your internet connection and try again.",
				variant: "destructive",
			};

		case "database_error":
			return {
				title: "Database Error",
				description:
					"A database error occurred. Please try again later or contact support.",
				variant: "destructive",
			};

		default:
			// Handle cases where we have a message but no specific code
			if (errorMessage.toLowerCase().includes("invalid")) {
				return {
					title: "Invalid Credentials",
					description: "Please check your email and password and try again.",
					variant: "destructive",
				};
			}

			if (errorMessage.toLowerCase().includes("password")) {
				return {
					title: "Password Error",
					description: errorMessage || "There was an issue with your password.",
					variant: "destructive",
				};
			}

			if (errorMessage.toLowerCase().includes("email")) {
				return {
					title: "Email Error",
					description:
						errorMessage || "There was an issue with your email address.",
					variant: "destructive",
				};
			}

			// Fallback for any other errors
			return {
				title: "Error",
				description:
					errorMessage || "An unexpected error occurred. Please try again.",
				variant: "destructive",
			};
	}
};

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [activeTab, setActiveTab] = useState("login");

	// Sign up form state
	const [signUpData, setSignUpData] = useState({
		email: "",
		password: "",
		confirmPassword: "",
		fullName: "",
		phone: "",
		role: "member" as "admin" | "member" | "trainer",
	});
	const [showSignUpPassword, setShowSignUpPassword] = useState(false);

	const router = useRouter();
	const { toast } = useToast();
	const auth = useAuth();

	// Redirect if already authenticated
	useEffect(() => {
		if (auth.user && !auth.loading) {
			if (auth.user.user_metadata?.role === "admin") {
				router.push("/admin/dashboard");
			} else {
				router.push("/member/dashboard");
			}
		}
	}, [auth.user, auth.loading, router]);

	// Demo credentials for testing
	const demoCredentials = [
		{
			email: "admin+admin@corefactory.com",
			password: "Admin123!",
			role: "Admin",
			name: "System Administrator",
		},
		{
			email: "member@corefactory.com",
			password: "Member123!",
			role: "Member",
			name: "John Doe",
		},
	];

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const { data, error } = await auth.signIn(email, password);

			if (error) {
				const errorInfo = getErrorMessage(error);
				toast({
					title: errorInfo.title,
					description: errorInfo.description,
					variant: errorInfo.variant,
				});
				return;
			}

			if (data?.user) {
				toast({
					title: "Login Successful! 🎉",
					description: `Welcome back! Redirecting to your dashboard...`,
					variant: "default",
				});

				const user_role = data.user?.identities?.[0]?.identity_data?.role;
				if (user_role === "admin") {
					router.push("/admin/dashboard");
				} else {
					router.push("/member/dashboard");
				}
			}
		} catch (error: any) {
			console.error("Login error:", error);
			const errorInfo = getErrorMessage(error);
			toast({
				title: errorInfo.title,
				description: errorInfo.description,
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		// Client-side validation
		if (signUpData.password !== signUpData.confirmPassword) {
			toast({
				title: "Passwords Don't Match",
				description: "Please make sure your passwords match.",
				variant: "destructive",
			});
			setIsLoading(false);
			return;
		}

		if (signUpData.password.length < 8) {
			toast({
				title: "Password Too Short",
				description: "Password must be at least 8 characters long.",
				variant: "destructive",
			});
			setIsLoading(false);
			return;
		}

		if (!signUpData.fullName.trim()) {
			toast({
				title: "Full Name Required",
				description: "Please enter your full name.",
				variant: "destructive",
			});
			setIsLoading(false);
			return;
		}

		// Email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(signUpData.email)) {
			toast({
				title: "Invalid Email",
				description: "Please enter a valid email address.",
				variant: "destructive",
			});
			setIsLoading(false);
			return;
		}

		try {
			const { data, error } = await auth.signUp(
				signUpData.email,
				signUpData.password,
				{
					full_name: signUpData.fullName,
					role: signUpData.role,
				}
			);

			if (error) {
				const errorInfo = getErrorMessage(error);
				toast({
					title: errorInfo.title,
					description: errorInfo.description,
					variant: errorInfo.variant,
				});
				return;
			}

			if (data?.user) {
				// Check if email confirmation is required
				if (data.user.email_confirmed_at) {
					toast({
						title: "Account Created Successfully! 🎉",
						description:
							"Your account has been created and you can now sign in.",
						variant: "default",
					});
				} else {
					toast({
						title: "Account Created! 📧",
						description:
							"Please check your email and click the verification link to complete your registration.",
						variant: "default",
					});
				}

				// Switch to login tab and pre-fill email
				setActiveTab("login");
				setEmail(signUpData.email);

				// Reset form
				setSignUpData({
					email: "",
					password: "",
					confirmPassword: "",
					fullName: "",
					phone: "",
					role: "member",
				});
			}
		} catch (error: any) {
			console.error("Sign up error:", error);
			const errorInfo = getErrorMessage(error);
			toast({
				title: errorInfo.title,
				description: errorInfo.description,
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const fillDemoCredentials = (email: string, password: string) => {
		setEmail(email);
		setPassword(password);
		setActiveTab("login");
	};

	// Show loading if auth is still initializing
	if (auth.loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-background">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-background p-4">
			<div className="w-full max-w-md space-y-4">
				{/* Demo Credentials Alert */}
				<Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
					<Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
					<AlertDescription className="text-blue-800 dark:text-blue-200">
						<div className="space-y-2">
							<div className="font-medium">Demo credentials available:</div>
							{demoCredentials.map((cred, index) => (
								<div
									key={index}
									className="flex items-center justify-between text-xs">
									<span>
										{cred.email} ({cred.role})
									</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											fillDemoCredentials(cred.email, cred.password)
										}
										className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 h-6 px-2">
										Use
									</Button>
								</div>
							))}
						</div>
					</AlertDescription>
				</Alert>

				<Card>
					<CardHeader className="text-center">
						<CardTitle className="text-2xl">Core Factory</CardTitle>
						<CardDescription>Your gym management system</CardDescription>
					</CardHeader>

					<CardContent>
						<Tabs value={activeTab} onValueChange={setActiveTab}>
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="login">
									<LogIn className="h-4 w-4 mr-2" />
									Login
								</TabsTrigger>
								<TabsTrigger value="signup">
									<UserPlus className="h-4 w-4 mr-2" />
									Sign Up
								</TabsTrigger>
							</TabsList>

							{/* Login Tab */}
							<TabsContent value="login">
								<form onSubmit={handleLogin} className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="email">Email</Label>
										<div className="relative">
											<Input
												id="email"
												type="email"
												placeholder="admin@corefactory.com"
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												required
												disabled={isLoading}
												className="pl-10"
											/>
											<Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="password">Password</Label>
										<div className="relative">
											<Input
												id="password"
												type={showPassword ? "text" : "password"}
												placeholder="Enter your password"
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												required
												disabled={isLoading}
												className="pl-10 pr-10"
											/>
											<Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
												onClick={() => setShowPassword(!showPassword)}
												disabled={isLoading}>
												{showPassword ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</Button>
										</div>
									</div>

									<Button type="submit" className="w-full" disabled={isLoading}>
										{isLoading ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
												Signing in...
											</>
										) : (
											"Sign In"
										)}
									</Button>
								</form>
							</TabsContent>

							{/* Sign Up Tab */}
							<TabsContent value="signup">
								<form onSubmit={handleSignUp} className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="signUpEmail">Email</Label>
										<Input
											id="signUpEmail"
											type="email"
											placeholder="your.email@example.com"
											value={signUpData.email}
											onChange={(e) =>
												setSignUpData((prev) => ({
													...prev,
													email: e.target.value,
												}))
											}
											required
											disabled={isLoading}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="fullName">Full Name</Label>
										<Input
											id="fullName"
											type="text"
											placeholder="John Doe"
											value={signUpData.fullName}
											onChange={(e) =>
												setSignUpData((prev) => ({
													...prev,
													fullName: e.target.value,
												}))
											}
											required
											disabled={isLoading}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="phone">Phone (Optional)</Label>
										<Input
											id="phone"
											type="tel"
											placeholder="+1 (555) 123-4567"
											value={signUpData.phone}
											onChange={(e) =>
												setSignUpData((prev) => ({
													...prev,
													phone: e.target.value,
												}))
											}
											disabled={isLoading}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="role">Role</Label>
										<Select
											value={signUpData.role}
											onValueChange={(value: "admin" | "member" | "trainer") =>
												setSignUpData((prev) => ({ ...prev, role: value }))
											}
											disabled={isLoading}>
											<SelectTrigger>
												<SelectValue placeholder="Select your role" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="member">Member</SelectItem>
												<SelectItem value="trainer">Trainer</SelectItem>
												<SelectItem value="admin">Admin</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="signUpPassword">Password</Label>
										<div className="relative">
											<Input
												id="signUpPassword"
												type={showSignUpPassword ? "text" : "password"}
												placeholder="Create a strong password (min 8 characters)"
												value={signUpData.password}
												onChange={(e) =>
													setSignUpData((prev) => ({
														...prev,
														password: e.target.value,
													}))
												}
												required
												disabled={isLoading}
												className="pr-10"
											/>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
												onClick={() =>
													setShowSignUpPassword(!showSignUpPassword)
												}
												disabled={isLoading}>
												{showSignUpPassword ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</Button>
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="confirmPassword">Confirm Password</Label>
										<Input
											id="confirmPassword"
											type="password"
											placeholder="Confirm your password"
											value={signUpData.confirmPassword}
											onChange={(e) =>
												setSignUpData((prev) => ({
													...prev,
													confirmPassword: e.target.value,
												}))
											}
											required
											disabled={isLoading}
										/>
									</div>

									<Button type="submit" className="w-full" disabled={isLoading}>
										{isLoading ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
												Creating Account...
											</>
										) : (
											"Create Account"
										)}
									</Button>
								</form>
							</TabsContent>
						</Tabs>
					</CardContent>

					<CardFooter className="flex flex-col space-y-4">
						<div className="text-center">
							<Link
								href="/forgot-password"
								className="text-sm text-muted-foreground hover:text-primary">
								Forgot your password?
							</Link>
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
