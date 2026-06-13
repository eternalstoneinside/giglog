import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import Calendar from "../components/Calendar";
import EntryModal from "../components/EntryModal";
import MonthSummary from "../components/MonthSummary";

const getEntryAmount = (entry) => {
	if (entry.amount !== null && entry.amount !== undefined && entry.amount !== "") {
		return entry.amount;
	}
	if (entry.hours && entry.rate) {
		return (Number(entry.hours) * Number(entry.rate)).toFixed(2);
	}
	return null;
};

const getDateString = (date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const isSameMonth = (firstDate, secondDate) =>
	firstDate.getFullYear() === secondDate.getFullYear() &&
	firstDate.getMonth() === secondDate.getMonth();

const formatEntryDate = (date) =>
	new Date(`${date}T12:00:00`).toLocaleDateString("uk-UA", {
		day: "numeric",
		month: "long",
		weekday: "short",
	});

export default function Home({ session }) {
	const [entries, setEntries] = useState([]);
	const [selectedDate, setSelectedDate] = useState(null);
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [modalOpen, setModalOpen] = useState(false);
	const [loadingEntries, setLoadingEntries] = useState(true);
	const [error, setError] = useState("");
	const [menuOpen, setMenuOpen] = useState(false);
	const [reportStatus, setReportStatus] = useState("");

	const fetchEntries = useCallback(async () => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const from = new Date(year, month, 1).toISOString().split("T")[0];
		const to = new Date(year, month + 1, 0).toISOString().split("T")[0];

		await Promise.resolve();
		setLoadingEntries(true);
		setError("");

		const { data, error: fetchError } = await supabase
			.from("entries")
			.select("*")
			.eq("user_id", session.user.id)
			.gte("date", from)
			.lte("date", to);

		if (fetchError) {
			setEntries([]);
			setError("Не вдалося завантажити записи. Перевір Supabase.");
			setLoadingEntries(false);
			return;
		}

		setEntries(data || []);
		setLoadingEntries(false);
	}, [currentMonth, session.user.id]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			fetchEntries();
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [fetchEntries]);

	const handleLogout = async () => {
		await supabase.auth.signOut();
	};

	const handleMenuToggle = () => {
		setMenuOpen((open) => !open);
		setReportStatus("");
	};

	const handleDayClick = (date) => {
		setSelectedDate(date);
		setModalOpen(true);
	};

	const today = new Date();
	const todayDate = getDateString(today);
	const hasTodayEntry =
		isSameMonth(currentMonth, today) &&
		entries.some((entry) => entry.date === todayDate);

	const handleTodayClick = () => {
		setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
		handleDayClick(todayDate);
	};

	const prevMonth = () =>
		setCurrentMonth(
			new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
		);
	const nextMonth = () =>
		setCurrentMonth(
			new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
		);

	const monthName = currentMonth.toLocaleString("uk-UA", {
		month: "long",
		year: "numeric",
	});
	const sortedEntries = useMemo(
		() => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
		[entries],
	);
	const pendingEntries = useMemo(
		() => sortedEntries.filter((entry) => getEntryAmount(entry) === null),
		[sortedEntries],
	);
	const totalMonth = useMemo(
		() =>
			entries.reduce(
				(sum, entry) => sum + (parseFloat(getEntryAmount(entry)) || 0),
				0,
			),
		[entries],
	);
	const totalHours = useMemo(
		() =>
			entries.reduce((sum, entry) => sum + (parseFloat(entry.hours) || 0), 0),
		[entries],
	);
	const reportText = useMemo(() => {
		const summary = [
			`${totalMonth.toFixed(2)} zł`,
			totalHours > 0 ? `${totalHours} год` : null,
			`${entries.length} ${entries.length === 1 ? "день" : "днів"}`,
		]
			.filter(Boolean)
			.join(" · ");

		const lines = [`GigLog — ${monthName}`, summary];

		if (pendingEntries.length > 0) {
			lines.push(`Треба дописати: ${pendingEntries.length}`);
		}

		if (sortedEntries.length > 0) {
			lines.push("");
			sortedEntries.forEach((entry) => {
				const amount = getEntryAmount(entry);
				const workDetails = [
					entry.location || "Без місця",
					entry.description || null,
					entry.hours ? `${entry.hours} год` : null,
				]
					.filter(Boolean)
					.join(" — ");
				lines.push(
					`${formatEntryDate(entry.date)} — ${workDetails} — ${
						amount ? `${amount} zł` : "сума пізніше"
					}`,
				);
			});
		}

		return lines.join("\n");
	}, [
		entries.length,
		monthName,
		pendingEntries.length,
		sortedEntries,
		totalHours,
		totalMonth,
	]);
	const userName =
		session.user.user_metadata?.name || session.user.email || "GigLog";

	const handleCopyReport = async () => {
		await navigator.clipboard.writeText(reportText);
		setReportStatus("copy");
	};

	const handleSendTelegram = async () => {
		await navigator.clipboard.writeText(reportText);
		setReportStatus("telegram");

		if (navigator.share) {
			try {
				await navigator.share({ text: reportText });
				return;
			} catch (shareError) {
				if (shareError.name === "AbortError") return;
			}
		}

		const params = new URLSearchParams({
			url: "",
			text: reportText,
		});
		const telegramAppUrl = `tg://msg_url?${params.toString()}`;
		const telegramWebUrl = `https://t.me/share/url?${params.toString()}`;

		let fallbackId;
		const cancelFallback = () => {
			window.clearTimeout(fallbackId);
			document.removeEventListener("visibilitychange", cancelFallback);
			window.removeEventListener("pagehide", cancelFallback);
			window.removeEventListener("blur", cancelFallback);
		};

		document.addEventListener("visibilitychange", cancelFallback, { once: true });
		window.addEventListener("pagehide", cancelFallback, { once: true });
		window.addEventListener("blur", cancelFallback, { once: true });

		window.location.href = telegramAppUrl;
		fallbackId = window.setTimeout(() => {
			window.location.href = telegramWebUrl;
		}, 900);
	};

	return (
		<main className="h-screen overflow-hidden bg-gray-950 text-white">
			<div className="no-scrollbar mx-auto h-full max-w-md overflow-y-auto px-4 pb-8 pt-5">
				<header className="relative mb-5 flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="text-sm text-gray-500">Привіт</p>
						<h1 className="truncate text-2xl font-bold">{userName}</h1>
					</div>
					<button
						type="button"
						onClick={handleMenuToggle}
						className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gray-900 text-gray-300 transition-all duration-150 hover:-translate-y-0.5 hover:bg-gray-800 active:translate-y-0 active:scale-95"
						aria-label="Меню"
					>
						<span className="flex flex-col gap-1">
							<span className="h-0.5 w-4 rounded-full bg-current" />
							<span className="h-0.5 w-4 rounded-full bg-current" />
							<span className="h-0.5 w-4 rounded-full bg-current" />
						</span>
					</button>

					{menuOpen && (
						<div className="absolute right-0 top-14 z-20 w-64 rounded-2xl border border-white/10 bg-gray-900 p-2 shadow-2xl shadow-black/40">
							<button
								type="button"
								onClick={handleSendTelegram}
								className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-200 transition hover:bg-gray-800 active:scale-[0.99]"
							>
								<span>Надіслати звіт в Telegram</span>
								<span className="text-xs text-gray-500">TG</span>
							</button>

							<button
								type="button"
								onClick={handleCopyReport}
								className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-400 transition hover:bg-gray-800 hover:text-gray-200 active:scale-[0.99]"
							>
								<span>Тільки скопіювати</span>
								<span className="text-xs text-gray-500">copy</span>
							</button>

							{reportStatus && (
								<p className="px-3 pb-2 text-xs text-green-400">
									{reportStatus === "telegram"
										? "Скопійовано. Якщо TG не відкрився, просто встав текст вручну."
										: "Скопійовано."}
								</p>
							)}

							<div className="my-1 h-px bg-white/10" />

							<button
								type="button"
								onClick={handleLogout}
								className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-950 active:scale-[0.99]"
							>
								Вийти
							</button>
						</div>
					)}
				</header>

				{!hasTodayEntry && (
					<button
						type="button"
						onClick={handleTodayClick}
						className="mb-4 flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 active:scale-[0.99]"
					>
						+ Сьогодні
					</button>
				)}

				{pendingEntries.length > 0 && (
					<button
						type="button"
						onClick={() => handleDayClick(pendingEntries[0].date)}
						className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-amber-950 p-4 text-left text-amber-100 transition-all duration-150 hover:-translate-y-0.5 hover:bg-amber-900 active:translate-y-0 active:scale-[0.99]"
					>
						<div>
							<p className="text-sm font-bold">Треба дописати</p>
							<p className="mt-1 text-xs text-amber-200/80">
								{pendingEntries.length}{" "}
								{pendingEntries.length === 1 ? "день без суми" : "дні без суми"}
							</p>
						</div>
						<span className="text-xl">›</span>
					</button>
				)}

				<section className="mb-4 rounded-2xl bg-gray-900 p-3">
					<div className="grid grid-cols-[40px_1fr_40px] items-center gap-3">
						<button
							type="button"
							onClick={prevMonth}
							className="grid h-10 w-10 place-items-center rounded-xl bg-gray-800 text-2xl text-gray-300 transition-all duration-150 hover:-translate-y-0.5 hover:bg-gray-700 active:translate-y-0 active:scale-95"
							aria-label="Попередній місяць"
						>
							<span className="h-2.5 w-2.5 rotate-45 border-b-2 border-l-2 border-current" />
						</button>
						<div className="text-center">
							<p className="text-xs text-gray-500">Місяць</p>
							<p className="font-bold capitalize">{monthName}</p>
						</div>
						<button
							type="button"
							onClick={nextMonth}
							className="grid h-10 w-10 place-items-center rounded-xl bg-gray-800 text-2xl text-gray-300 transition-all duration-150 hover:-translate-y-0.5 hover:bg-gray-700 active:translate-y-0 active:scale-95"
							aria-label="Наступний місяць"
						>
							<span className="h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-current" />
						</button>
					</div>
				</section>

				<MonthSummary total={totalMonth} count={entries.length} />

				{error && (
					<p className="mb-4 rounded-xl bg-red-950 px-4 py-3 text-sm text-red-200">
						{error}
					</p>
				)}

				{loadingEntries ? (
					<div className="mb-4 rounded-2xl bg-gray-900 p-6 text-center text-sm text-gray-400">
						Завантажую записи...
					</div>
				) : (
					<Calendar
						currentMonth={currentMonth}
						entries={entries}
						onDayClick={handleDayClick}
						selectedDate={selectedDate}
					/>
				)}

				<section>
					<div className="mb-3 flex items-center justify-between gap-3">
						<h2 className="font-bold">Записи</h2>
						<p className="text-xs text-gray-500">тапни день, щоб додати</p>
					</div>

					{!loadingEntries && sortedEntries.length === 0 && !error && (
						<div className="rounded-2xl border border-dashed border-gray-800 p-6 text-center text-sm text-gray-500">
							Поки пусто. Обери день у календарі і додай перший запис.
						</div>
					)}

					{sortedEntries.length > 0 && (
						<div className="flex flex-col gap-2">
							{sortedEntries.map((entry) => {
								const entryAmount = getEntryAmount(entry);
								const entryHasAmount = entryAmount !== null;
								const entryDetails = [
									formatEntryDate(entry.date),
									entry.hours ? `${entry.hours} год` : null,
									entry.description || "Без опису",
								]
									.filter(Boolean)
									.join(" · ");

								return (
									<button
										key={entry.id}
										type="button"
										onClick={() => handleDayClick(entry.date)}
										className="flex items-center justify-between gap-3 rounded-2xl bg-gray-900 p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:bg-gray-800 active:translate-y-0 active:scale-[0.99]"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-semibold">
												{entry.location || "Без місця"}
											</p>
											<p className="truncate text-xs text-gray-500">
												{entryDetails}
											</p>
										</div>
										<span
											className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
												entryHasAmount
													? "bg-green-950 text-green-300"
													: "bg-amber-950 text-amber-200"
											}`}
										>
											{entryHasAmount
												? `${entryAmount} zł`
												: "сума пізніше"}
										</span>
									</button>
								);
							})}
						</div>
					)}
				</section>

				{modalOpen && (
					<EntryModal
						date={selectedDate}
						userId={session.user.id}
						existingEntry={entries.find((entry) => entry.date === selectedDate)}
						onClose={() => setModalOpen(false)}
						onSave={fetchEntries}
					/>
				)}
			</div>
		</main>
	);
}
