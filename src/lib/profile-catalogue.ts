import { z } from "zod";

export const PROFILE_TYPES = ["social", "banking", "school", "others"] as const;
export type ProfileType = (typeof PROFILE_TYPES)[number];

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
	social: "Social",
	banking: "Banking",
	school: "School",
	others: "Others",
};

export const PROFILE_TABS = [
	"identity",
	"contact",
	"address",
	"education",
	"work",
	"social",
] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

export const CONTACT_METHOD_OPTIONS = [
	"Email",
	"Phone",
	"SMS",
	"Mail",
	"In-app notification",
] as const;

export const COUNTRY_OPTIONS = [
	"Afghanistan",
	"Albania",
	"Algeria",
	"Andorra",
	"Angola",
	"Argentina",
	"Armenia",
	"Australia",
	"Austria",
	"Azerbaijan",
	"Bahamas",
	"Bahrain",
	"Bangladesh",
	"Barbados",
	"Belarus",
	"Belgium",
	"Belize",
	"Benin",
	"Bhutan",
	"Bolivia",
	"Bosnia and Herzegovina",
	"Botswana",
	"Brazil",
	"Brunei",
	"Bulgaria",
	"Burkina Faso",
	"Burundi",
	"Cambodia",
	"Cameroon",
	"Canada",
	"Cape Verde",
	"Central African Republic",
	"Chad",
	"Chile",
	"China",
	"Colombia",
	"Comoros",
	"Congo",
	"Costa Rica",
	"Croatia",
	"Cuba",
	"Cyprus",
	"Czech Republic",
	"Democratic Republic of the Congo",
	"Denmark",
	"Djibouti",
	"Dominica",
	"Dominican Republic",
	"Ecuador",
	"Egypt",
	"El Salvador",
	"Equatorial Guinea",
	"Eritrea",
	"Estonia",
	"Eswatini",
	"Ethiopia",
	"Fiji",
	"Finland",
	"France",
	"Gabon",
	"Gambia",
	"Georgia",
	"Germany",
	"Ghana",
	"Greece",
	"Grenada",
	"Guatemala",
	"Guinea",
	"Guinea-Bissau",
	"Guyana",
	"Haiti",
	"Honduras",
	"Hungary",
	"Iceland",
	"India",
	"Indonesia",
	"Iran",
	"Iraq",
	"Ireland",
	"Israel",
	"Italy",
	"Ivory Coast",
	"Jamaica",
	"Japan",
	"Jordan",
	"Kazakhstan",
	"Kenya",
	"Kiribati",
	"Kuwait",
	"Kyrgyzstan",
	"Laos",
	"Latvia",
	"Lebanon",
	"Lesotho",
	"Liberia",
	"Libya",
	"Liechtenstein",
	"Lithuania",
	"Luxembourg",
	"Madagascar",
	"Malawi",
	"Malaysia",
	"Maldives",
	"Mali",
	"Malta",
	"Marshall Islands",
	"Mauritania",
	"Mauritius",
	"Mexico",
	"Micronesia",
	"Moldova",
	"Monaco",
	"Mongolia",
	"Montenegro",
	"Morocco",
	"Mozambique",
	"Myanmar",
	"Namibia",
	"Nauru",
	"Nepal",
	"Netherlands",
	"New Zealand",
	"Nicaragua",
	"Niger",
	"Nigeria",
	"North Korea",
	"North Macedonia",
	"Norway",
	"Oman",
	"Pakistan",
	"Palau",
	"Palestine",
	"Panama",
	"Papua New Guinea",
	"Paraguay",
	"Peru",
	"Philippines",
	"Poland",
	"Portugal",
	"Qatar",
	"Romania",
	"Russia",
	"Rwanda",
	"Saint Kitts and Nevis",
	"Saint Lucia",
	"Saint Vincent and the Grenadines",
	"Samoa",
	"San Marino",
	"Sao Tome and Principe",
	"Saudi Arabia",
	"Senegal",
	"Serbia",
	"Seychelles",
	"Sierra Leone",
	"Singapore",
	"Slovakia",
	"Slovenia",
	"Solomon Islands",
	"Somalia",
	"South Africa",
	"South Korea",
	"South Sudan",
	"Spain",
	"Sri Lanka",
	"Sudan",
	"Suriname",
	"Sweden",
	"Switzerland",
	"Syria",
	"Taiwan",
	"Tajikistan",
	"Tanzania",
	"Thailand",
	"Timor-Leste",
	"Togo",
	"Tonga",
	"Trinidad and Tobago",
	"Tunisia",
	"Turkey",
	"Turkmenistan",
	"Tuvalu",
	"Uganda",
	"Ukraine",
	"United Arab Emirates",
	"United Kingdom",
	"United States",
	"Uruguay",
	"Uzbekistan",
	"Vanuatu",
	"Vatican City",
	"Venezuela",
	"Vietnam",
	"Yemen",
	"Zambia",
	"Zimbabwe",
] as const;

export type FieldDef = {
	key: string;
	label: string;
	placeholder: string;
	type?:
		| "text"
		| "email"
		| "tel"
		| "url"
		| "date"
		| "number"
		| "textarea"
		| "select";
	options?: readonly string[];
};

export const TAB_LABELS: Record<ProfileTab, string> = {
	identity: "Identity",
	contact: "Contact",
	address: "Address",
	education: "Education",
	work: "Work",
	social: "Social",
};

export const TAB_FIELDS: Record<ProfileTab, FieldDef[]> = {
	identity: [
		{
			key: "profilePicture",
			label: "Profile picture",
			placeholder: "Profile picture URL",
			type: "url",
		},
		{ key: "firstName", label: "First name", placeholder: "Your first name" },
		{
			key: "middleName",
			label: "Middle name",
			placeholder: "Your middle name (optional)",
		},
		{ key: "lastName", label: "Last name", placeholder: "Your last name" },
		{
			key: "displayName",
			label: "Display name",
			placeholder: "How others see you",
		},
		{ key: "username", label: "Username", placeholder: "Choose a username" },
		{
			key: "dateOfBirth",
			label: "Date of birth",
			placeholder: "YYYY-MM-DD",
			type: "date",
		},
		{
			key: "pronouns",
			label: "Pronouns",
			placeholder: "e.g. they/them, she/her",
		},
		{
			key: "genderIdentity",
			label: "Gender identity",
			placeholder: "Gender identity (optional)",
		},
		{
			key: "nationalityCountry",
			label: "Nationality / Country",
			placeholder: "Select nationality / country",
			type: "select",
			options: COUNTRY_OPTIONS,
		},
	],
	contact: [
		{
			key: "email",
			label: "Email",
			placeholder: "you@example.com",
			type: "email",
		},
		{
			key: "phoneNumber",
			label: "Phone number",
			placeholder: "+60 12 345 6789",
			type: "tel",
		},
		{
			key: "preferredContactMethod",
			label: "Preferred contact method",
			placeholder: "Select preferred contact method",
			type: "select",
			options: CONTACT_METHOD_OPTIONS,
		},
	],
	address: [
		{
			key: "address",
			label: "Address",
			placeholder: "Street address",
			type: "textarea",
		},
		{ key: "city", label: "City", placeholder: "City" },
		{
			key: "stateRegion",
			label: "State / Region",
			placeholder: "State or region",
		},
		{
			key: "country",
			label: "Country",
			placeholder: "Select country",
			type: "select",
			options: COUNTRY_OPTIONS,
		},
		{ key: "postcode", label: "Postcode", placeholder: "Postal code" },
		{
			key: "publicLocation",
			label: "Public location",
			placeholder: "e.g. Kuala Lumpur (for public profiles)",
		},
	],
	education: [
		{ key: "studentId", label: "Student ID", placeholder: "Student ID number" },
		{
			key: "institutionName",
			label: "Institution name",
			placeholder: "e.g. University of Malaya",
		},
		{
			key: "courseProgramme",
			label: "Course / Programme",
			placeholder: "e.g. B.Sc. Computer Science",
		},
		{
			key: "yearOfStudy",
			label: "Year of study",
			placeholder: "e.g. 2027",
			type: "number",
		},
		{
			key: "graduationYear",
			label: "Graduation year",
			placeholder: "e.g. 2027",
			type: "number",
		},
	],
	work: [
		{
			key: "jobTitle",
			label: "Job title",
			placeholder: "e.g. Software Engineer",
		},
		{
			key: "organisationName",
			label: "Organisation name",
			placeholder: "Company or institution",
		},
		{
			key: "department",
			label: "Department",
			placeholder: "Department or team",
		},
		{
			key: "portfolioUrl",
			label: "Portfolio URL",
			placeholder: "https://",
			type: "url",
		},
		{
			key: "linkedInUrl",
			label: "LinkedIn URL",
			placeholder: "https://linkedin.com/in/",
			type: "url",
		},
	],
	social: [
		{ key: "bio", label: "Bio", placeholder: "A short bio…", type: "textarea" },
		{
			key: "interests",
			label: "Interests",
			placeholder: "Comma-separated interests",
		},
		{
			key: "socialLinks",
			label: "Social links",
			placeholder: "One URL per line",
			type: "textarea",
		},
		{
			key: "emergencyContactName",
			label: "Emergency contact name",
			placeholder: "Emergency contact name",
		},
		{
			key: "emergencyContactRelationship",
			label: "Emergency contact relationship",
			placeholder: "Relationship",
		},
		{
			key: "emergencyContactPhone",
			label: "Emergency contact phone",
			placeholder: "+60 12 345 6789",
			type: "tel",
		},
	],
};

export const ATTRIBUTE_FIELDS: Record<string, FieldDef> = Object.fromEntries(
	Object.values(TAB_FIELDS)
		.flat()
		.map((field) => [field.key, field]),
);

export const ATTRIBUTE_LABELS: Record<string, string> = Object.fromEntries(
	Object.values(TAB_FIELDS)
		.flat()
		.map((field) => [field.key, field.label]),
);

export const ALLOWED_ATTRIBUTE_KEYS: readonly string[] =
	Object.keys(ATTRIBUTE_FIELDS);

export const ATTRIBUTE_OIDC_CLAIMS: Record<string, string> = {
	profilePicture: "picture",
	firstName: "given_name",
	middleName: "middle_name",
	lastName: "family_name",
	displayName: "name",
	username: "preferred_username",
	email: "email",
};

// --- Per-attribute Zod validation -----------------------------------------
// Each schema is `z.string()`. Empty strings are allowed for optional fields
// (they fall back to the Base Identity). Fields marked "required" here reject
// blank/whitespace-only values.

const IS_EMAIL = z.email();
const IS_URL = z.url();

function opener(value: string): boolean {
	return value === "" || /^https?:\/\//i.test(value);
}

export const ATTRIBUTE_SCHEMAS: Record<string, z.ZodType<string>> = {
	profilePicture: z.string().max(500).refine(opener, "Must be an http(s) URL"),
	firstName: z
		.string()
		.trim()
		.min(1, "First name is required")
		.max(100, "Must be 100 characters or fewer"),
	lastName: z
		.string()
		.trim()
		.min(1, "Last name is required")
		.max(100, "Must be 100 characters or fewer"),
	middleName: z.string().max(100, "Must be 100 characters or fewer"),
	displayName: z.string().max(100, "Must be 100 characters or fewer"),
	username: z.string().max(50, "Must be 50 characters or fewer"),
	dateOfBirth: z
		.string()
		.refine(
			(v) => !v || z.iso.date().safeParse(v).success,
			"Invalid date (YYYY-MM-DD)",
		)
		.refine(
			(v) => !v || new Date(v) <= new Date(),
			"Date cannot be in the future",
		),
	pronouns: z.string().max(30, "Must be 30 characters or fewer"),
	genderIdentity: z.string().max(50, "Must be 50 characters or fewer"),
	nationalityCountry: z
		.string()
		.trim()
		.min(1, "Select a nationality / country")
		.refine(
			(v) => (COUNTRY_OPTIONS as readonly string[]).includes(v),
			"Invalid nationality / country",
		),
	email: z
		.string()
		.trim()
		.max(254, "Must be 254 characters or fewer")
		.refine(
			(v) => !v || IS_EMAIL.safeParse(v).success,
			"Invalid email address",
		),
	phoneNumber: z
		.string()
		.max(20, "Must be 20 characters or fewer")
		.refine((v) => !v || /^[\d\s\-+()]{6,20}$/.test(v), "Invalid phone number"),
	preferredContactMethod: z
		.string()
		.refine(
			(v) => !v || (CONTACT_METHOD_OPTIONS as readonly string[]).includes(v),
			"Invalid contact method",
		),
	address: z.string().max(500, "Must be 500 characters or fewer"),
	city: z.string().max(100, "Must be 100 characters or fewer"),
	stateRegion: z.string().max(100, "Must be 100 characters or fewer"),
	country: z
		.string()
		.refine(
			(v) => !v || (COUNTRY_OPTIONS as readonly string[]).includes(v),
			"Invalid country",
		),
	postcode: z.string().max(20, "Must be 20 characters or fewer"),
	publicLocation: z.string().max(200, "Must be 200 characters or fewer"),
	studentId: z.string().max(50, "Must be 50 characters or fewer"),
	institutionName: z.string().max(200, "Must be 200 characters or fewer"),
	courseProgramme: z.string().max(200, "Must be 200 characters or fewer"),
	yearOfStudy: z
		.string()
		.max(4, "Must be 4 characters or fewer")
		.refine((v) => !v || /^\d{1,4}$/.test(v), "Must be a number"),
	graduationYear: z
		.string()
		.max(4, "Must be 4 characters or fewer")
		.refine((v) => !v || /^\d{1,4}$/.test(v), "Must be a number"),
	jobTitle: z.string().max(200, "Must be 200 characters or fewer"),
	organisationName: z.string().max(200, "Must be 200 characters or fewer"),
	department: z.string().max(200, "Must be 200 characters or fewer"),
	portfolioUrl: z
		.string()
		.max(500, "Must be 500 characters or fewer")
		.refine(opener, "Invalid URL (must start with http(s)://)"),
	linkedInUrl: z
		.string()
		.max(500, "Must be 500 characters or fewer")
		.refine(opener, "Invalid URL (must start with http(s)://)"),
	bio: z.string().max(2000, "Must be 2000 characters or fewer"),
	interests: z.string().max(500, "Must be 500 characters or fewer"),
	socialLinks: z
		.string()
		.max(2000, "Must be 2000 characters or fewer")
		.refine(
			(v) =>
				!v ||
				v
					.split("\n")
					.every(
						(line) => !line.trim() || IS_URL.safeParse(line.trim()).success,
					),
			"Invalid URL (must start with http(s)://)",
		),
	emergencyContactName: z.string().max(200, "Must be 200 characters or fewer"),
	emergencyContactRelationship: z
		.string()
		.max(100, "Must be 100 characters or fewer"),
	emergencyContactPhone: z
		.string()
		.max(20, "Must be 20 characters or fewer")
		.refine((v) => !v || /^[\d\s\-+()]{6,20}$/.test(v), "Invalid phone number"),
};

// Emergency contact group: if any one is filled, all three must be.
export function emergencyGroupErrors(
	attrs: Record<string, string>,
): Record<string, string> {
	const {
		emergencyContactName,
		emergencyContactPhone,
		emergencyContactRelationship,
	} = attrs;
	if (
		!emergencyContactName &&
		!emergencyContactPhone &&
		!emergencyContactRelationship
	) {
		return {};
	}
	const errors: Record<string, string> = {};
	if (!emergencyContactName?.trim()) {
		errors.emergencyContactName =
			"Name is required if any emergency contact field is filled";
	}
	if (!emergencyContactPhone?.trim()) {
		errors.emergencyContactPhone =
			"Phone is required if any emergency contact field is filled";
	}
	return errors;
}

export function validateAttribute(key: string, value: unknown): string {
	const schema = ATTRIBUTE_SCHEMAS[key];
	if (!schema) {
		return `Unknown attribute key: ${key}`;
	}
	const result = schema.safeParse(value);
	return result.success ? "" : (result.error.issues[0]?.message ?? "");
}
