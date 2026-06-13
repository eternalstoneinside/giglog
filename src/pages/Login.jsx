import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleLogin = async () => {
		setLoading(true);
		setError("");

		const { error: loginError } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: window.location.origin,
			},
		});

		if (loginError) {
			setError("Не вийшло увійти через Google. Спробуй ще раз.");
			setLoading(false);
		}
	};

	return (
		<main className="min-h-screen bg-gray-950 px-5 text-white">
			<div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center">
				<div className="mb-8">
					<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black">
						G
					</div>
					<h1 className="text-4xl font-bold">GigLog</h1>
					<p className="mt-3 text-sm leading-6 text-gray-400">
						Швидкий журнал підробітків: день, місце, сума.
					</p>
					<p className="mt-2 text-xs font-semibold text-blue-400">
						для пациків ♡
					</p>
				</div>

				<button
					type="button"
					onClick={handleLogin}
					disabled={loading}
					className="flex h-12 items-center justify-center gap-3 rounded-xl bg-white px-5 text-sm font-semibold text-gray-950 transition-all duration-150 hover:-translate-y-0.5 hover:bg-gray-100 active:translate-y-0 active:scale-[0.99] disabled:opacity-70"
				>
					<span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-bold text-blue-600">
						G
					</span>
					{loading ? "Відкриваю Google..." : "Увійти через Google"}
				</button>

				{error && (
					<p className="mt-4 rounded-xl bg-red-950 px-4 py-3 text-sm text-red-200">
						{error}
					</p>
				)}
			</div>
		</main>
	);
}
