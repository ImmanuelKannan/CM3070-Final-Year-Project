const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

export function formatDateTime(value: Date | string): string {
	const date = value instanceof Date ? value : new Date(value);
	return DATE_TIME_FORMAT.format(date);
}
