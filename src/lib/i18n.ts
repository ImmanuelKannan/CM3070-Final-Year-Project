export const locale = "en";

export const messages = {
	meta: {
		title: "HeyMe",
		description: "HeyMe is a personal identity service.",
		ogTitle: "HeyMe!",
	},
	nav: {
		brandLabel: "HeyMe home",
		home: "Home",
		dashboard: "Dashboard",
		signIn: "Sign in",
		signOut: "Sign out",
		signingOut: "Signing out…",
		label: "Primary Nav",
		skipToContent: "Skip to content",
	},
	brand: {
		name: "HeyMe",
	},
	home: {
		title: "Your identiy, your terms",
		lede: "HeyMe is a place for you to keep your identity information",
		heading: "One identity. Your terms.",
		body: "A personal identity layer you control. Decide which details go to which app and keep the rest private.",
	},
	auth: {
		signIn: {
			title: "Sign in to HeyMe",
			lede: "Welcome back. Use the email and password tied to your HeyMe account.",
			emailLabel: "Email",
			emailPlaceholder: "you@example.com",
			passwordLabel: "Password",
			submit: "Sign in",
			submitting: "Signing in…",
			errorHeading: "We couldn't sign you in",
			errorBody:
				"That email and password don't match. Double-check them and try again.",
			noAccount: "New to HeyMe?",
			createAccount: "Create an account",
		},
		signUp: {
			title: "Create your HeyMe account",
			lede: "Start with the identity details tied to your new account.",
			firstNameLabel: "First name",
			lastNameLabel: "Last name",
			emailLabel: "Email",
			emailPlaceholder: "you@example.com",
			passwordLabel: "Password",
			passwordHint: "Use at least 8 characters.",
			submit: "Create account",
			submitting: "Creating account…",
			errorHeading: "We couldn't create your account",
			errorBody:
				"Check your details and try again. If you already have an account, sign in instead.",
			hasAccount: "Already have an account?",
			signIn: "Sign in",
		},
		signedInAs: "Signed in as {name}",
		signedInAsEmail: "Signed in as {email}",
		avatarAlt: "{name}'s avatar",
		signOutError: "Couldn't sign out. Try again.",
	},
	dashboard: {
		title: "HeyMe dashboard",
		lede: "This is your HeyMe dashboard",
		body: "Manage your identity here",
		identity: {
			lede: "Update the details apps will see when they ask HeyMe who you are.",
			personalHeading: "Personal details",
			contactHeading: "Contact details",
			firstNameLabel: "First name",
			lastNameLabel: "Last name",
			emailLabel: "Contact email",
			emailHint:
				"Apps you connect reach you at this address. It stays separate from the email you sign in with.",
			save: "Save changes",
			saving: "Saving…",
			saved: "Your identity is up to date.",
			errorHeading: "We couldn't save your identity",
			errorBody:
				"Check your details and try again. If the problem keeps happening, reload the page.",
		},
	},
	footer: {
		copyright: "© HeyMe",
		note: "A personal identity service.",
	},
} as const;
