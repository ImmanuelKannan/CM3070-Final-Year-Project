import type { ComponentProps } from "react";

import { cn } from "#/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
	return (
		<input
			className={cn(
				"w-full rounded-lg bg-white border border-line px-3.5 py-2.5 text-sea-ink placeholder:text-sea-ink-soft focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60",
				className,
			)}
			{...props}
		/>
	);
}
