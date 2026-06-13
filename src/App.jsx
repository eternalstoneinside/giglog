import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Home from "./pages/Home";

const transitionDelay = 180;

export default function App() {
	const [session, setSession] = useState(null);
	const [displayedSession, setDisplayedSession] = useState(null);
	const [loading, setLoading] = useState(true);
	const [switching, setSwitching] = useState(false);
	const [error, setError] = useState("");
	const ready = useRef(false);

	useEffect(() => {
		supabase.auth
			.getSession()
			.then(({ data: { session } }) => {
				setSession(session);
			})
			.catch(() => {
				setError("Не вдалося перевірити сесію. Онови сторінку.");
			})
			.finally(() => {
				setLoading(false);
			});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			setError("");
		});

		return () => subscription.unsubscribe();
	}, []);

	useEffect(() => {
		if (loading) return;

		if (!ready.current) {
			ready.current = true;
			setDisplayedSession(session);
			return;
		}

		setSwitching(true);
		const timeoutId = window.setTimeout(() => {
			setDisplayedSession(session);
			window.requestAnimationFrame(() => setSwitching(false));
		}, transitionDelay);

		return () => window.clearTimeout(timeoutId);
	}, [loading, session]);

	if (loading)
		return (
			<div className="min-h-screen bg-gray-950 flex items-center justify-center">
				<p className="text-gray-400">Завантаження...</p>
			</div>
		);

	if (error)
		return (
			<div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
				<p className="max-w-sm rounded-xl bg-red-950 px-4 py-3 text-center text-sm text-red-200">
					{error}
				</p>
			</div>
		);

	return (
		<div className="app-shell">
			<div
				key={displayedSession ? "home" : "login"}
				className={`page-shell ${switching ? "page-leave" : "page-enter"}`}
			>
				{displayedSession ? <Home session={displayedSession} /> : <Login />}
			</div>

			{switching && (
				<div className="auth-transition" aria-hidden="true">
					<div className="auth-transition__mark">G</div>
				</div>
			)}
		</div>
	);
}
