"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function DebugPage() {
	const auth = useAuth();

	if (auth.loading) {
		return <div className="p-8">Loading authentication status...</div>;
	}

	if (!auth.user) {
		return <div className="p-8">❌ Not authenticated - please log in first</div>;
	}

	return (
		<div className="p-8 max-w-4xl mx-auto">
			<h1 className="text-3xl font-bold mb-6">🔍 Debug User Authentication</h1>
			
			<div className="space-y-6">
				<div className="bg-blue-50 p-4 rounded-lg">
					<h2 className="text-xl font-semibold mb-3">Basic Info</h2>
					<p><strong>Email:</strong> {auth.user.email}</p>
					<p><strong>User ID:</strong> {auth.user.id}</p>
					<p><strong>Email Confirmed:</strong> {auth.user.email_confirmed_at ? '✅ Yes' : '❌ No'}</p>
				</div>

				<div className="bg-green-50 p-4 rounded-lg">
					<h2 className="text-xl font-semibold mb-3">Role Detection Results</h2>
					<p><strong>isAdmin:</strong> {auth.isAdmin ? '✅ TRUE' : '❌ FALSE'}</p>
					<p><strong>isMember:</strong> {auth.isMember ? '✅ TRUE' : '❌ FALSE'}</p>
					<p><strong>isTrainer:</strong> {auth.isTrainer ? '✅ TRUE' : '❌ FALSE'}</p>
				</div>

				<div className="bg-yellow-50 p-4 rounded-lg">
					<h2 className="text-xl font-semibold mb-3">User Metadata (where roles should be)</h2>
					<pre className="bg-white p-3 rounded text-sm overflow-x-auto">
						{JSON.stringify(auth.user.user_metadata, null, 2)}
					</pre>
					{!auth.user.user_metadata?.role && (
						<p className="text-red-600 mt-2">⚠️ No role found in user_metadata!</p>
					)}
				</div>

				<div className="bg-purple-50 p-4 rounded-lg">
					<h2 className="text-xl font-semibold mb-3">App Metadata</h2>
					<pre className="bg-white p-3 rounded text-sm overflow-x-auto">
						{JSON.stringify(auth.user.app_metadata, null, 2)}
					</pre>
				</div>

				<div className="bg-gray-50 p-4 rounded-lg">
					<h2 className="text-xl font-semibold mb-3">User Profile (from database)</h2>
					<pre className="bg-white p-3 rounded text-sm overflow-x-auto">
						{auth.userProfile ? JSON.stringify(auth.userProfile, null, 2) : 'Not loaded'}
					</pre>
				</div>

				<div className="bg-red-50 p-4 rounded-lg">
					<h2 className="text-xl font-semibold mb-3">🚨 Diagnosis</h2>
					{auth.user.user_metadata?.role === 'admin' ? (
						<p className="text-green-600">✅ User has admin role in metadata - should work!</p>
					) : auth.user.app_metadata?.role === 'admin' ? (
						<p className="text-green-600">✅ User has admin role in app metadata - should work!</p>
					) : auth.userProfile?.role === 'admin' ? (
						<p className="text-yellow-600">⚠️ User has admin role in database profile only - may not work with middleware</p>
					) : (
						<div>
							<p className="text-red-600">❌ No admin role found anywhere!</p>
							<p className="text-sm mt-2">The user needs admin role in user_metadata or app_metadata to access admin dashboard.</p>
						</div>
					)}
				</div>

				<div className="bg-blue-50 p-4 rounded-lg">
					<h2 className="text-xl font-semibold mb-3">🛠️ Next Steps</h2>
					{!auth.user.user_metadata?.role && !auth.user.app_metadata?.role ? (
						<div>
							<p className="mb-2">Your user doesn't have a role set in the auth metadata. You need to:</p>
							<ol className="list-decimal list-inside space-y-1 text-sm">
								<li>Run the bootstrap function to set up admin role</li>
								<li>Or manually update your user record in Supabase Auth</li>
							</ol>
						</div>
					) : (
						<p className="text-green-600">Role is set correctly - check for other issues</p>
					)}
				</div>
			</div>
		</div>
	);
} 