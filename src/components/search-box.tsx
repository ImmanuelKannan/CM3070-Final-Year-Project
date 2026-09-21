import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "#/components/ui/input";

export type SearchBoxLabels = {
	label: string;
	placeholder: string;
	clear: string;
	searching: string;
};

export function SearchBox({
	inputId,
	value,
	onChange,
	labels,
}: {
	inputId: string;
	value: string;
	onChange: (value: string) => void;
	labels: SearchBoxLabels;
}) {
	const [draft, setDraft] = useState(value);
	useEffect(() => {
		setDraft(value);
	}, [value]);
	const isSearching = draft !== value;
	return (
		<search className="grid gap-1.5">
			<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
				<label htmlFor={inputId} className="text-sm font-semibold text-sea-ink">
					{labels.label}
				</label>
				{draft ? (
					<button
						type="button"
						onClick={() => {
							setDraft("");
							onChange("");
						}}
						className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-lagoon-deep underline underline-offset-4 hover:text-sea-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						{labels.clear}
					</button>
				) : null}
			</div>
			<div className="relative">
				<Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-sea-ink-soft" />
				<Input
					id={inputId}
					type="search"
					value={draft}
					maxLength={200}
					onChange={(e) => {
						setDraft(e.target.value);
						onChange(e.target.value);
					}}
					placeholder={labels.placeholder}
					className="min-h-11 pl-10 pr-9"
				/>
				{isSearching ? (
					<span
						aria-live="polite"
						className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
					>
						<Loader2 className="h-4 w-4 animate-spin text-lagoon-deep motion-reduce:animate-none" />
						<span className="sr-only">{labels.searching}</span>
					</span>
				) : null}
			</div>
		</search>
	);
}
