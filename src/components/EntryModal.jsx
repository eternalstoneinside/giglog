import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const getDateString = (date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

const getInitialMode = (entry) => (entry?.hours ? "hours" : "amount");

const formatDateChip = (date) =>
	new Date(`${date}T12:00:00`).toLocaleDateString("uk-UA", {
		day: "numeric",
		month: "short",
		weekday: "short",
	});

export default function EntryModal({
	date,
	userId,
	existingEntry,
	onClose,
	onSave,
}) {
	const [mode, setMode] = useState(getInitialMode(existingEntry));
	const [selectedDates, setSelectedDates] = useState([date]);
	const [location, setLocation] = useState(existingEntry?.location || "");
	const [description, setDescription] = useState(
		existingEntry?.description || "",
	);
	const [amount, setAmount] = useState(existingEntry?.amount ?? "");
	const [hours, setHours] = useState(existingEntry?.hours ?? "");
	const [rate, setRate] = useState(existingEntry?.rate ?? "");
	const [loading, setLoading] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [closing, setClosing] = useState(false);
	const [error, setError] = useState("");

	const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString(
		"uk-UA",
		{
			day: "numeric",
			month: "long",
			weekday: "long",
		},
	);
	const dateOptions = useMemo(() => {
		const startDate = new Date(`${date}T12:00:00`);
		return Array.from({ length: 14 }, (_, index) => {
			const optionDate = new Date(startDate);
			optionDate.setDate(startDate.getDate() + index);
			return getDateString(optionDate);
		});
	}, [date]);

	const resetDeleteConfirm = () => setConfirmDelete(false);
	const requestClose = () => {
		if (closing) return;

		setClosing(true);
		window.setTimeout(onClose, 190);
	};

	const toggleSelectedDate = (selectedDate) => {
		setSelectedDates((dates) => {
			if (dates.includes(selectedDate)) {
				return dates.length === 1
					? dates
					: dates.filter((item) => item !== selectedDate);
			}

			return [...dates, selectedDate].sort();
		});
		resetDeleteConfirm();
	};

	const getDistributedAmounts = () => {
		const cleanAmount = String(amount).trim();
		if (mode !== "multi" || cleanAmount === "") return null;

		const totalCents = Math.round(Number(cleanAmount) * 100);
		if (!Number.isFinite(totalCents)) return null;

		const baseCents = Math.trunc(totalCents / selectedDates.length);
		const remainder = totalCents % selectedDates.length;

		return selectedDates.map((_, index) =>
			((baseCents + (index < remainder ? 1 : 0)) / 100).toFixed(2),
		);
	};

	const getWorkPayload = (amountOverride) => {
		const cleanAmount = String(amount).trim();
		const cleanHours = String(hours).trim();
		const cleanRate = String(rate).trim();
		const isHourlyMode = mode === "hours" || mode === "multi";
		const calculatedAmount =
			isHourlyMode && cleanHours !== "" && cleanRate !== ""
				? (Number(cleanHours) * Number(cleanRate)).toFixed(2)
				: null;

		return {
			location: location.trim(),
			description: description.trim(),
			amount:
				amountOverride !== undefined
					? amountOverride
					: mode === "amount"
					? cleanAmount === ""
						? null
						: cleanAmount
					: calculatedAmount,
			hours: isHourlyMode && cleanHours !== "" ? cleanHours : null,
			rate: isHourlyMode && cleanRate !== "" ? cleanRate : null,
		};
	};

	const saveMultiDayEntries = async () => {
		const distributedAmounts = getDistributedAmounts();
		const payloadByDate = new Map(
			selectedDates.map((selectedDate, index) => [
				selectedDate,
				getWorkPayload(distributedAmounts?.[index]),
			]),
		);

		const { data: existingRows, error: lookupError } = await supabase
			.from("entries")
			.select("id,date")
			.eq("user_id", userId)
			.in("date", selectedDates);

		if (lookupError) return lookupError;

		const existingDates = new Set(existingRows.map((entry) => entry.date));
		const rowsToInsert = selectedDates
			.filter((selectedDate) => !existingDates.has(selectedDate))
			.map((selectedDate) => ({
				user_id: userId,
				date: selectedDate,
				...payloadByDate.get(selectedDate),
			}));

		const updateResults = await Promise.all(
			existingRows.map((entry) =>
				supabase
					.from("entries")
					.update(payloadByDate.get(entry.date))
					.eq("id", entry.id),
			),
		);
		const updateError = updateResults.find((result) => result.error)?.error;
		if (updateError) return updateError;

		if (rowsToInsert.length === 0) return null;

		const { error: insertError } = await supabase
			.from("entries")
			.insert(rowsToInsert);
		return insertError;
	};

	const handleSave = async () => {
		setError("");
		setLoading(true);

		if (mode === "multi" && selectedDates.length === 0) {
			setLoading(false);
			setError("Обери хоча б один день.");
			return;
		}

		const payload = getWorkPayload();
		const saveError =
			mode === "multi"
				? await saveMultiDayEntries()
				: existingEntry
					? (
							await supabase
								.from("entries")
								.update(payload)
								.eq("id", existingEntry.id)
						).error
					: (
							await supabase.from("entries").insert({
								user_id: userId,
								date,
								...payload,
							})
						).error;

		setLoading(false);

		if (saveError) {
			setError("Не вдалося зберегти запис. Спробуй ще раз.");
			return;
		}

		await onSave();
		requestClose();
	};

	const handleDelete = async () => {
		if (!existingEntry) return;

		if (!confirmDelete) {
			setConfirmDelete(true);
			return;
		}

		setError("");
		setLoading(true);
		const { error: deleteError } = await supabase
			.from("entries")
			.delete()
			.eq("id", existingEntry.id);
		setLoading(false);

		if (deleteError) {
			setError("Не вдалося видалити запис. Спробуй ще раз.");
			return;
		}

		await onSave();
		requestClose();
	};

	return (
		<div
			className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3"
			data-closing={closing ? "true" : "false"}
			onClick={requestClose}
		>
			<div
				className="modal-sheet mb-3 w-full max-w-md rounded-3xl bg-gray-900 p-5 shadow-2xl shadow-black/40"
				data-closing={closing ? "true" : "false"}
				onClick={(event) => event.stopPropagation()}
			>
				<div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-700" />

				<div className="mb-5 flex items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
							{existingEntry ? "Редагування дня" : "Новий день"}
						</p>
						<h2 className="mt-1 text-xl font-bold capitalize">
							{formattedDate}
						</h2>
						<p className="mt-1 text-xs text-gray-500">
							Можна записати готову суму, години або кілька днів одразу.
						</p>
					</div>
					<button
						type="button"
						onClick={requestClose}
						className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-800 text-xl text-gray-300 transition-all duration-150 hover:bg-gray-700 active:scale-95"
						aria-label="Закрити"
					>
						<span className="relative h-3.5 w-3.5">
							<span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 rotate-45 rounded-full bg-current" />
							<span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 -rotate-45 rounded-full bg-current" />
						</span>
					</button>
				</div>

				<div className="mb-4 grid grid-cols-3 rounded-xl bg-gray-800 p-1">
					{[
						["amount", "Сума"],
						["hours", "Години"],
						["multi", "Кілька днів"],
					].map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={() => {
								setMode(value);
								resetDeleteConfirm();
							}}
							className={`h-10 rounded-lg text-sm font-semibold transition ${
								mode === value
									? "bg-blue-600 text-white"
									: "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
							}`}
						>
							{label}
						</button>
					))}
				</div>

				<div className="flex flex-col gap-3">
					{mode === "multi" && (
						<div>
							<div className="mb-1.5 flex items-center justify-between gap-3">
								<span className="text-xs font-semibold text-gray-400">
									Обери дні
								</span>
								<span className="text-xs text-gray-500">
									{selectedDates.length} вибрано
								</span>
							</div>
							<div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded-xl bg-gray-800 p-2">
								{dateOptions.map((optionDate) => {
									const selected = selectedDates.includes(optionDate);

									return (
										<button
											key={optionDate}
											type="button"
											onClick={() => toggleSelectedDate(optionDate)}
											className={`rounded-lg px-3 py-2 text-left text-xs font-semibold transition active:scale-95 ${
												selected
													? "bg-blue-600 text-white"
													: "bg-gray-900 text-gray-300 hover:bg-gray-700"
											}`}
										>
											{formatDateChip(optionDate)}
										</button>
									);
								})}
							</div>
						</div>
					)}

					<label className="block">
						<span className="mb-1.5 block text-xs font-semibold text-gray-400">
							Де був?
						</span>
						<input
							type="text"
							placeholder="Наприклад: Opole, GenesisArt, DenisBoss, тощо."
							value={location}
							onChange={(event) => {
								setLocation(event.target.value);
								resetDeleteConfirm();
							}}
							className="h-12 w-full rounded-xl bg-gray-800 px-4 text-sm outline-none ring-blue-500 placeholder:text-gray-500 hover:bg-gray-700/60 focus:ring-2"
						/>
						<div className="mt-2 flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => {
									setLocation("Opole");
									resetDeleteConfirm();
								}}
								className="rounded-full bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-all duration-150 hover:bg-gray-700 active:scale-95"
							>
								Opole
							</button>
						</div>
					</label>

					<label className="block">
						<span className="mb-1.5 block text-xs font-semibold text-gray-400">
							Що зробив?
						</span>
						<textarea
							placeholder="Щоб потім DenisBoss не питав, що це за день такий був :)"
							value={description}
							onChange={(event) => {
								setDescription(event.target.value);
								resetDeleteConfirm();
							}}
							rows={3}
							className="w-full resize-none rounded-xl bg-gray-800 px-4 py-3 text-sm outline-none ring-blue-500 placeholder:text-gray-500 hover:bg-gray-700/60 focus:ring-2"
						/>
					</label>

					{mode === "amount" ? (
						<label className="block">
							<div className="mb-1.5 flex items-center justify-between gap-3">
								<span className="text-xs font-semibold text-gray-400">
									Сума
								</span>
								<span className="text-xs text-gray-500">необов'язково</span>
							</div>
							<div className="flex h-12 items-center rounded-xl bg-gray-800 px-4 ring-blue-500 transition-colors duration-150 hover:bg-gray-700/60 focus-within:ring-2">
								<input
									type="number"
									inputMode="decimal"
									placeholder="0"
									value={amount}
									onChange={(event) => {
										setAmount(event.target.value);
										resetDeleteConfirm();
									}}
									className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
								/>
								<span className="ml-3 text-sm font-semibold text-gray-500">
									zł
								</span>
							</div>
						</label>
					) : (
						<div className="grid gap-3">
							<div className="grid grid-cols-2 gap-3">
								<label className="block">
									<span className="mb-1.5 block text-xs font-semibold text-gray-400">
										Кількість годин
									</span>
									<input
										type="number"
										inputMode="decimal"
										placeholder="8"
										value={hours}
										onChange={(event) => {
											setHours(event.target.value);
											resetDeleteConfirm();
										}}
										className="h-12 w-full rounded-xl bg-gray-800 px-4 text-sm outline-none ring-blue-500 placeholder:text-gray-500 hover:bg-gray-700/60 focus:ring-2"
									/>
								</label>

								<label className="block">
									<div className="mb-1.5 flex items-center justify-between gap-2">
										<span className="text-xs font-semibold text-gray-400">
											Ставка
										</span>
										<span className="text-xs text-gray-500">опц.</span>
									</div>
									<div className="flex h-12 items-center rounded-xl bg-gray-800 px-3 ring-blue-500 transition-colors duration-150 hover:bg-gray-700/60 focus-within:ring-2">
										<input
											type="number"
											inputMode="decimal"
											placeholder="30"
											value={rate}
											onChange={(event) => {
												setRate(event.target.value);
												resetDeleteConfirm();
											}}
											className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
										/>
										<span className="ml-2 text-sm font-semibold text-gray-500">
											zł/h
										</span>
									</div>
								</label>
							</div>

							{mode === "multi" && (
								<label className="block">
									<div className="mb-1.5 flex items-center justify-between gap-3">
										<span className="text-xs font-semibold text-gray-400">
											Загальна сума
										</span>
										<span className="text-xs text-gray-500">необов'язково</span>
									</div>
									<div className="flex h-12 items-center rounded-xl bg-gray-800 px-4 ring-blue-500 transition-colors duration-150 hover:bg-gray-700/60 focus-within:ring-2">
										<input
											type="number"
											inputMode="decimal"
											placeholder="0"
											value={amount}
											onChange={(event) => {
												setAmount(event.target.value);
												resetDeleteConfirm();
											}}
											className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
										/>
										<span className="ml-3 text-sm font-semibold text-gray-500">
											zł
										</span>
									</div>
									<p className="mt-1.5 text-xs text-gray-500">
										Якщо вказати, розкину суму по вибраних днях.
									</p>
								</label>
							)}
						</div>
					)}
				</div>

				{error && (
					<p className="mt-3 rounded-xl bg-red-950 px-4 py-3 text-sm text-red-200">
						{error}
					</p>
				)}

				<div className="mt-4 grid gap-2">
					<button
						type="button"
						onClick={handleSave}
						disabled={loading}
						className="h-12 rounded-xl bg-blue-600 font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 active:scale-[0.99] disabled:opacity-60"
					>
						{loading
							? "Збереження..."
							: mode === "multi"
								? "Зберегти дні"
								: existingEntry
									? "Оновити"
									: "Зберегти"}
					</button>

					{existingEntry && (
						<button
							type="button"
							onClick={handleDelete}
							disabled={loading}
							className={`h-12 rounded-xl font-semibold transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:opacity-60 ${
								confirmDelete
									? "bg-red-600 text-white hover:bg-red-500"
									: "bg-red-950 text-red-200 hover:bg-red-900"
							}`}
						>
							{confirmDelete ? "Точно видалити?" : "Видалити запис"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
