import { AlertCircle, Check, Loader2 } from "lucide-react";
import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";

import {
	emergencyGroupErrors,
	type FieldDef,
	validateAttribute,
} from "#/lib/profile-catalogue";
import { cn } from "#/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
	field: FieldDef;
	value: string;
	onChange: (key: string, value: string) => void;
	allAttributes?: Record<string, string>;
	onSave?: (key: string, value: string) => Promise<void>;
};

export function ProfileField({
	field,
	value,
	onChange,
	allAttributes,
	onSave,
}: Props) {
	const [draft, setDraft] = useState(value);
	const [status, setStatus] = useState<SaveStatus>("idle");
	const [error, setError] = useState("");
	const mountedRef = useRef(true);
	const latestRef = useRef(value);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const inputId = useId();

	useEffect(() => {
		setDraft(value);
		latestRef.current = value;
	}, [value]);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			if (timerRef.current !== null) clearTimeout(timerRef.current);
		};
	}, []);

	const handleBlur = useCallback(async () => {
		const trimmed = draft.trim();
		const key = field.key;

		const fieldError = validateAttribute(key, trimmed);
		if (fieldError) {
			setError(fieldError);
			return;
		}

		if (key.startsWith("emergencyContact")) {
			const merged = { ...allAttributes, [key]: trimmed };
			const emErr = emergencyGroupErrors(merged)[key];
			if (emErr) {
				setError(emErr);
				return;
			}
		}

		if (trimmed === latestRef.current) {
			setError("");
			return;
		}

		setError("");
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		setStatus("saving");

		try {
			if (onSave) await onSave(key, trimmed);
			if (!mountedRef.current) return;
			latestRef.current = trimmed;
			onChange(key, trimmed);
			setStatus("saved");
			timerRef.current = setTimeout(() => {
				if (mountedRef.current) setStatus("idle");
			}, 2000);
		} catch (saveErr) {
			if (!mountedRef.current) return;
			const message =
				saveErr instanceof Error && saveErr.message.trim() !== ""
					? saveErr.message
					: "Save failed";
			setError(message);
			setStatus("error");
		}
	}, [draft, field.key, onChange, allAttributes, onSave]);

	const handleChange = (
		event: ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		setDraft(event.target.value);
		if (status === "saved" || status === "error") setStatus("idle");
	};

	const isInvalid = error !== "";
	const fieldClasses = cn(
		"w-full rounded-lg border border-line bg-bg-base px-3.5 py-2.5 text-sea-ink placeholder:text-sea-ink-soft focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60",
		isInvalid && "border-destructive focus-visible:outline-destructive",
	);

	const statusNode = (() => {
		if (status === "saving") {
			return (
				<Loader2
					aria-hidden="true"
					className="h-4 w-4 animate-spin text-lagoon-deep"
				/>
			);
		}
		if (status === "saved") {
			return <Check aria-hidden="true" className="h-4 w-4 text-palm" />;
		}
		if (status === "error") {
			return (
				<AlertCircle aria-hidden="true" className="h-4 w-4 text-destructive" />
			);
		}
		return null;
	})();

	const statusPosition =
		field.type === "textarea" ? "top-3" : "top-1/2 -translate-y-1/2";

	const statusLabelId = `${inputId}-status`;

	const ariaDescribedBy = isInvalid ? `${inputId}-error` : undefined;

	let inputElement: React.ReactNode;
	if (field.type === "textarea") {
		inputElement = (
			<textarea
				id={inputId}
				value={draft}
				onChange={handleChange}
				onBlur={handleBlur}
				className={cn(fieldClasses, "min-h-20 resize-y pr-9")}
				placeholder={field.placeholder}
				rows={3}
				aria-invalid={isInvalid || undefined}
				aria-describedby={ariaDescribedBy}
			/>
		);
	} else if (field.type === "select") {
		inputElement = (
			<select
				id={inputId}
				value={draft}
				onChange={handleChange}
				onBlur={handleBlur}
				className={cn(fieldClasses, "pr-9")}
				aria-invalid={isInvalid || undefined}
				aria-describedby={ariaDescribedBy}
			>
				<option value="">{field.placeholder}</option>
				{field.options?.map((option) => (
					<option key={option} value={option}>
						{option}
					</option>
				))}
			</select>
		);
	} else {
		inputElement = (
			<input
				id={inputId}
				type={field.type ?? "text"}
				value={draft}
				onChange={handleChange}
				onBlur={handleBlur}
				className={cn(fieldClasses, "pr-9")}
				placeholder={field.placeholder}
				aria-invalid={isInvalid || undefined}
				aria-describedby={ariaDescribedBy}
			/>
		);
	}

	return (
		<div>
			<label
				htmlFor={inputId}
				className="mb-1.5 block text-sm font-semibold text-sea-ink"
			>
				{field.label}
			</label>

			<div className="relative">
				{inputElement}
				<span
					aria-live="polite"
					id={statusLabelId}
					className={cn(
						"pointer-events-none absolute right-2.5",
						statusPosition,
					)}
				>
					{statusNode}
				</span>
			</div>

			{isInvalid ? (
				<p
					id={`${inputId}-error`}
					role="alert"
					className="mt-1 text-xs font-semibold text-destructive"
				>
					{error}
				</p>
			) : null}
		</div>
	);
}
