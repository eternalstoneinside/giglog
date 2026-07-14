export default function MonthSummary({ total, paidTotal, unpaidTotal, count }) {
	return (
		<section className="mb-4 rounded-2xl bg-gray-900 p-4 shadow-lg shadow-black/10">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-sm text-gray-400">Разом за місяць</p>
					<p className="mt-1 text-3xl font-bold tracking-normal text-white">
						{total.toFixed(2)} zł
					</p>
				</div>
				<div className="rounded-full bg-green-950 px-3 py-1 text-sm font-semibold text-green-300">
					{count} записів
				</div>
			</div>
			<div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
				<div>
					<p className="text-xs text-gray-500">Оплачено</p>
					<p className="mt-0.5 text-sm font-bold text-green-300">
						{paidTotal.toFixed(2)} zł
					</p>
				</div>
				<div className="border-l border-white/10 pl-3">
					<p className="text-xs text-gray-500">Чекаю</p>
					<p className="mt-0.5 text-sm font-bold text-amber-200">
						{unpaidTotal.toFixed(2)} zł
					</p>
				</div>
			</div>
		</section>
	);
}
