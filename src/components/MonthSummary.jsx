export default function MonthSummary({ total, count }) {
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
		</section>
	);
}
