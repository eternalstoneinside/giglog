const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const getEntryAmount = (entry) => {
	if (!entry) return null;
	if (entry.amount !== null && entry.amount !== undefined && entry.amount !== "") {
		return entry.amount;
	}
	if (entry.hours && entry.rate) {
		return (Number(entry.hours) * Number(entry.rate)).toFixed(2);
	}
	return null;
};

export default function Calendar({
	currentMonth,
	entries,
	onDayClick,
	selectedDate,
}) {
	const year = currentMonth.getFullYear();
	const month = currentMonth.getMonth();
	const firstDay = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const offset = firstDay === 0 ? 6 : firstDay - 1;
	const today = new Date().toISOString().split("T")[0];

	const getDateString = (day) => {
		const dateMonth = String(month + 1).padStart(2, "0");
		const dateDay = String(day).padStart(2, "0");
		return `${year}-${dateMonth}-${dateDay}`;
	};

	const getEntryForDay = (day) => {
		const date = getDateString(day);
		return entries.find((entry) => entry.date === date);
	};

	return (
		<section className="mb-4 rounded-2xl bg-gray-900 p-3">
			<div className="mb-2 grid grid-cols-7">
				{weekDays.map((day) => (
					<div
						key={day}
						className="py-2 text-center text-[11px] font-semibold text-gray-500"
					>
						{day}
					</div>
				))}
			</div>

			<div className="grid grid-cols-7 gap-1.5">
				{Array.from({ length: offset }).map((_, index) => (
					<div key={`empty-${index}`} className="aspect-square" />
				))}

				{Array.from({ length: daysInMonth }).map((_, index) => {
					const day = index + 1;
					const date = getDateString(day);
					const entry = getEntryForDay(day);
					const entryAmount = getEntryAmount(entry);
					const hasValue = entryAmount !== null;
					const isPaid = hasValue && entry?.paid === true;
					const isToday = date === today;
					const isSelected = date === selectedDate;

					return (
						<button
							key={date}
							type="button"
							onClick={() => onDayClick(date)}
							className={`
								aspect-square rounded-xl text-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 active:translate-y-0 active:scale-95
								${isPaid ? "bg-green-950 text-green-300" : hasValue ? "bg-amber-950 text-amber-200" : entry ? "bg-gray-800 text-gray-300" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}
								${isToday ? "ring-2 ring-blue-500" : ""}
								${isSelected ? "outline outline-2 outline-white/60" : ""}
							`}
						>
							<span className="flex h-full flex-col items-center justify-center gap-0.5">
								<span className="font-semibold">{day}</span>
								{hasValue && (
									<span
										className={`max-w-full truncate px-1 text-[10px] leading-none ${
											isPaid ? "text-green-400" : "text-amber-300"
										}`}
									>
										{entryAmount} zł
									</span>
								)}
								{entry && !hasValue && (
									<span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
								)}
							</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}
