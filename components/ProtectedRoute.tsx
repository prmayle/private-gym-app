"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define UserRole type based on the database schema
export type UserRole = "admin" | "member" | "trainer";

interface ProtectedRouteProps {
	children: React.ReactNode;
	requiredRoles?: UserRole | UserRole[];
	fallback?: React.ReactNode;
	redirectTo?: string;
}

export function ProtectedRoute({
	children,
	requiredRoles,
	fallback,
	redirectTo,
}: ProtectedRouteProps) {
	const auth = useAuth();
	const router = useRouter();

	// Helper function to navigate to appropriate dashboard
	const navigateToDashboard = () => {
		alert("HERE22")
		console.log("auth.user", auth.user);
		console.log("auth.user", auth);
		// if (redirectTo) {
		// 	router.push(redirectTo);
		// } else if (auth.isAdmin) {
		// 	router.push("/admin/dashboard");
		// } else {
		// 	router.push("/member/dashboard");
		// }
	};

	// Helper function to navigate to login
	const navigateToLogin = () => {
		router.push("/login");
	};

	// Show loading spinner while auth is initializing
	if (auth.loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Card className="w-full max-w-md">
					<CardContent className="flex flex-col items-center justify-center p-8">
						<Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
						<h3 className="text-lg font-semibold mb-2">Loading...</h3>
						<p className="text-sm text-muted-foreground text-center">
							Checking authentication status
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// User not authenticated
	if (!auth.user) {
		if (fallback) {
			return <>{fallback}</>;
		}

		return (
			<div className="min-h-screen flex items-center justify-center">
				<Card className="w-full max-w-md">
					<CardContent className="flex flex-col items-center justify-center p-8">
						<Shield className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-semibold mb-2">
							Authentication Required
						</h3>
						<p className="text-sm text-muted-foreground text-center mb-6">
							You need to be logged in to access this page.
						</p>
						<Button onClick={navigateToLogin}>Go to Login</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Check role requirements
	if (requiredRoles) {
		const hasRequiredRole = Array.isArray(requiredRoles)
			? requiredRoles.some((role) => auth.hasRole(role))
			: auth.hasRole(requiredRoles);

		if (!hasRequiredRole) {
			return (
				<div className="min-h-screen flex items-center justify-center">
					<Card className="w-full max-w-md">
						<CardContent className="flex flex-col items-center justify-center p-8">
							<AlertCircle className="h-12 w-12 text-destructive mb-4" />
							<h3 className="text-lg font-semibold mb-2">Access Denied</h3>
							<p className="text-sm text-muted-foreground text-center mb-2">
								You don't have permission to access this page.
							</p>
							<p className="text-xs text-muted-foreground text-center mb-6">
								Required role:{" "}
								{Array.isArray(requiredRoles)
									? requiredRoles.join(", ")
									: requiredRoles}
								<br />
								Your role: {auth.userProfile?.role || "Unknown"}
							</p>
							<Button onClick={navigateToDashboard}>Go to Dashboard</Button>
						</CardContent>
					</Card>
				</div>
			);
		}
	}

	// User authenticated and authorized
	return <>{children}</>;
}

// Convenience components for specific roles
export function AdminRoute({
	children,
	fallback,
}: {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	return (
		<ProtectedRoute requiredRoles="admin" fallback={fallback}>
			{children}
		</ProtectedRoute>
	);
}

export function MemberRoute({
	children,
	fallback,
}: {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	return (
		<ProtectedRoute requiredRoles="member" fallback={fallback}>
			{children}
		</ProtectedRoute>
	);
}

export function TrainerRoute({
	children,
	fallback,
}: {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	return (
		<ProtectedRoute requiredRoles="trainer" fallback={fallback}>
			{children}
		</ProtectedRoute>
	);
}

// Component that shows content only to authenticated users
export function AuthenticatedOnly({
	children,
	fallback,
}: {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	const auth = useAuth();

	if (auth.loading) {
		return <div className="animate-pulse h-8 bg-muted rounded"></div>;
	}

	if (!auth.user) {
		return fallback ? <>{fallback}</> : null;
	}

	return <>{children}</>;
}

// Component that shows content only to specific roles
export function RoleBasedContent({
	roles,
	children,
	fallback,
}: {
	roles: UserRole | UserRole[];
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	const auth = useAuth();

	if (auth.loading) {
		return <div className="animate-pulse h-8 bg-muted rounded"></div>;
	}

	const hasRequiredRole = Array.isArray(roles)
		? roles.some((role) => auth.hasRole(role))
		: auth.hasRole(roles);

	if (!hasRequiredRole) {
		return fallback ? <>{fallback}</> : null;
	}

	return <>{children}</>;
}
