import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { messages } from "#/lib/i18n";
import {
	ALLOWED_ATTRIBUTE_KEYS,
	ATTRIBUTE_LABELS,
} from "#/lib/profile-catalogue";

type MultiselectAttributeProps = {
	value: string[];
	onValueChange: (value: string[]) => void;
};

function renderValue(value: string[]) {
	if (value.length === 0) {
		return (
			<span className="text-sea-ink-soft">
				{messages.developer.identityAttributesSelectPlaceholder}
			</span>
		);
	}

	const firstLabel = ATTRIBUTE_LABELS[value[0] ?? ""] ?? value[0] ?? "";
	return value.length === 1
		? firstLabel
		: `${firstLabel} (+${value.length - 1} more)`;
}

export function MultiselectAttribute({
	value,
	onValueChange,
}: MultiselectAttributeProps) {
	return (
		<Select.Root<string, true>
			multiple
			value={value}
			onValueChange={onValueChange}
			required
		>
			<Select.Label className="font-semibold text-sea-ink">
				{messages.developer.identityAttributeSelectLabel}
			</Select.Label>
			<Select.Trigger className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-line bg-bg-base px-3.5 py-2.5 text-left text-sea-ink data-[popup-open]:border-lagoon-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
				<Select.Value>{renderValue}</Select.Value>
				<Select.Icon>
					<ChevronDown className="size-4 text-sea-ink-soft" />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Positioner
					sideOffset={4}
					alignItemWithTrigger={false}
					className="z-50"
				>
					<Select.Popup className="max-h-72 min-w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-line bg-bg-surface p-1 text-sea-ink shadow-lg">
						{ALLOWED_ATTRIBUTE_KEYS.map((key) => (
							<Select.Item
								key={key}
								value={key}
								className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60 data-[highlighted]:bg-lagoon/10"
							>
								<Select.ItemText>
									{ATTRIBUTE_LABELS[key] ?? key}
								</Select.ItemText>
								<Select.ItemIndicator>
									<Check className="size-4 text-lagoon-deep" />
								</Select.ItemIndicator>
							</Select.Item>
						))}
					</Select.Popup>
				</Select.Positioner>
			</Select.Portal>
		</Select.Root>
	);
}
