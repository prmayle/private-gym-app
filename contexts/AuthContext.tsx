"use client";

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
	useMemo,
} from "react";
import { User, Session, AuthError, AuthResponse } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import {
	getUserProfile,
	getMemberProfile,
	UserProfile,
	MemberProfile,
} from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
	// Authentication state
	user: User | null;
	userProfile: UserProfile | null;
	memberProfile: MemberProfile | null;
	session: Session | null;
	loading: boolean;

	// Authentication methods
	signIn: (email: string, password: string) => Promise<AuthResponse>;
	signOut: () => Promise<void>;
	resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
	updatePassword: (password: string) => Promise<{ error: AuthError | null }>;

	// Profile management
	updateProfile: (
		updates: Partial<UserProfile>
	) => Promise<{ error: Error | null }>;
	refreshProfile: () => Promise<void>;

	// Utility methods
	isAdmin: boolean;
	isMember: boolean;
	isTrainer: boolean;
	hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	// Core state
	const [user, setUser] = useState<User | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(
		null
	);
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const [profileLoadingRef, setProfileLoadingRef] = useState<string | null>(null);

	const router = useRouter();
	const { toast } = useToast();
	const supabase = useMemo(() => createClient(), []);

	// Initialize auth state
	useEffect(() => {
		let mounted = true;

		const getInitialSession = async () => {
			try {
				const {
					data: { session },
					error,
				} = await supabase.auth.getSession();

				if (error) {
					console.error("Error getting session:", error);
					return;
				}

				if (mounted && session) {
					setSession(session);
					setUser(session.user);
					// Load profiles in background, don't block initial loading
					loadUserProfiles(session.user.id).catch(console.error);
				}
			} catch (error) {
				console.error("Error in getInitialSession:", error);
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		getInitialSession();

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(
			async (event: string, session: Session | null) => {
				console.log("Auth state changed:", event, session?.user?.email);

				if (mounted) {
					setSession(session);
					setUser(session?.user ?? null);

					if (session?.user) {
						// Load profiles in background, don't block state change
						loadUserProfiles(session.user.id).catch(console.error);
					} else {
						setUserProfile(null);
						setMemberProfile(null);
					}

					setLoading(false);
				}
			}
		);

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, [supabase]);

	// Load user profiles from database
	const loadUserProfiles = useCallback(
		async (userId: string) => {
			// Prevent race conditions by checking if this is the latest request
			const currentRequest = userId;
			setProfileLoadingRef(currentRequest);

			try {
				// Load user profile
				const profile = await getUserProfile(supabase, userId);
				
				// Only update state if this is still the latest request
				if (currentRequest === userId) {
					setUserProfile(profile);

					// Load member profile if user is a member
					if (profile.role === "member") {
						try {
							const memberData = await getMemberProfile(supabase, userId);
							if (currentRequest === userId) {
								setMemberProfile(memberData);
							}
						} catch (error) {
							// Member profile might not exist yet, which is okay
							console.log(
								"Member profile not found (this is normal for new users)"
							);
							if (currentRequest === userId) {
								setMemberProfile(null);
							}
						}
					} else {
						if (currentRequest === userId) {
							setMemberProfile(null);
						}
					}
				}
			} catch (error) {
				console.error("Error loading user profiles:", error);
				// Don't throw here - user might not have profile yet
			} finally {
				// Clear loading ref if this was the latest request
				if (currentRequest === userId) {
					setProfileLoadingRef(null);
				}
			}
		},
		[supabase]
	);


	// Sign in function
	const signIn = async (
		email: string,
		password: string
	): Promise<AuthResponse> => {
		try {
			setLoading(true);

			const { data, error } = await supabase.auth.signInWithPassword({
				email: email as string,
				password: password as string,
			});

			if (error) {
				console.log("Sign in error:", error);
				toast({
					title: "Sign in failed",
					description: getErrorMessage(error),
					variant: "destructive",
				});
				return { data: { user: null, session: null }, error };
			}

			// Success message will be handled by auth state change
			return { data, error: null };
		} catch (error) {
			const authError = error as AuthError;
			toast({
				title: "Sign in failed",
				description: getErrorMessage(authError),
				variant: "destructive",
			});
			return { data: { user: null, session: null }, error: authError };
		} finally {
			setLoading(false);
		}
	};

	// Sign out function
	const signOut = async (): Promise<void> => {
		try {
			setLoading(true);
			const { error } = await supabase.auth.signOut();

			if (error) {
				toast({
					title: "Sign out failed",
					description: getErrorMessage(error),
					variant: "destructive",
				});
				throw error;
			}

			// Clear local state
			setUser(null);
			setUserProfile(null);
			setMemberProfile(null);
			setSession(null);

			// Redirect to login
			router.push("/login");

			toast({
				title: "Signed out successfully",
				description: "You have been logged out.",
			});
		} catch (error) {
			console.error("Error signing out:", error);
		} finally {
			setLoading(false);
		}
	};

	// Reset password function
	const resetPassword = async (email: string) => {
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/reset-password`,
			});

			if (error) {
				toast({
					title: "Password reset failed",
					description: getErrorMessage(error),
					variant: "destructive",
				});
				return { error };
			}

			toast({
				title: "Check your email",
				description: "We've sent you a password reset link.",
			});

			return { error: null };
		} catch (error) {
			const authError = error as AuthError;
			toast({
				title: "Password reset failed",
				description: getErrorMessage(authError),
				variant: "destructive",
			});
			return { error: authError };
		}
	};

	// Update password function
	const updatePassword = async (password: string) => {
		try {
			const { error } = await supabase.auth.updateUser({ password });

			if (error) {
				toast({
					title: "Password update failed",
					description: getErrorMessage(error),
					variant: "destructive",
				});
				return { error };
			}

			toast({
				title: "Password updated",
				description: "Your password has been updated successfully.",
			});

			return { error: null };
		} catch (error) {
			const authError = error as AuthError;
			toast({
				title: "Password update failed",
				description: getErrorMessage(authError),
				variant: "destructive",
			});
			return { error: authError };
		}
	};

	// Update profile function
	const updateProfile = async (updates: Partial<UserProfile>) => {
		try {
			if (!user) {
				throw new Error("No authenticated user");
			}

			const { error } = await supabase
				.from("profiles")
				.update(updates)
				.eq("id", user.id);

			if (error) {
				toast({
					title: "Profile update failed",
					description: error.message,
					variant: "destructive",
				});
				return { error };
			}

			// Refresh profile data
			await refreshProfile();

			toast({
				title: "Profile updated",
				description: "Your profile has been updated successfully.",
			});

			return { error: null };
		} catch (error) {
			const err = error as Error;
			toast({
				title: "Profile update failed",
				description: err.message,
				variant: "destructive",
			});
			return { error: err };
		}
	};

	// Refresh profile function
	const refreshProfile = async (): Promise<void> => {
		if (user) {
			await loadUserProfiles(user.id);
		}
	};

	// Role-based utility functions - use JWT metadata first (best practice)
	const getUserRole = (): string | null => {
		// Get role from JWT metadata first (bypasses RLS issues)
		return (
			user?.user_metadata?.role ||
			user?.app_metadata?.role ||
			userProfile?.role ||
			null
		);
	};

	const isAdmin = getUserRole() === "admin";
	const isMember = getUserRole() === "member";
	const isTrainer = getUserRole() === "trainer";
	const hasRole = (role: string) => getUserRole() === role;

	// Enhanced error message function
	const getErrorMessage = (error: AuthError): string => {
		const errorMessages: Record<string, string> = {
			invalid_credentials:
				"❌ Invalid email or password. Please check your credentials.",
			email_not_confirmed:
				"📧 Please check your email and confirm your account before signing in.",
			user_not_found: "👤 No account found with this email address.",
			weak_password: "🔒 Password should be at least 6 characters long.",
			signup_disabled: "🚫 New registrations are currently disabled.",
			email_address_invalid: "📧 Please enter a valid email address.",
			password_is_too_short: "🔒 Password must be at least 6 characters.",
			invalid_email: "📧 Please enter a valid email address.",
			email_address_not_authorized:
				"🚫 This email is not authorized to create an account.",
			too_many_requests:
				"⏱️ Too many requests. Please wait a moment and try again.",
			unexpected_failure:
				"💥 Database connection issue. Please contact support.",
			captcha_failed: "🤖 Captcha verification failed. Please try again.",
			over_email_send_rate_limit:
				"📧 Too many emails sent. Please wait before requesting another.",
			database_error_querying_schema:
				"🔧 Database configuration issue. Please contact support.",
		};

		return (
			errorMessages[error.message] ||
			`⚠️ ${error.message || "An unexpected error occurred"}`
		);
	};

	const value: AuthContextType = {
		// State
		user,
		userProfile,
		memberProfile,
		session,
		loading,

		// Methods
		signIn,
		signOut,
		resetPassword,
		updatePassword,
		updateProfile,
		refreshProfile,

		// Utilities
		isAdmin,
		isMember,
		isTrainer,
		hasRole,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
