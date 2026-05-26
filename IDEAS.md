# Mise — Ideas & Roadmap

Everything we're thinking about building. Roughly ordered by priority and effort.

---

## 🟢 Next Up — High Priority, Smaller Lifts

### Tag Filtering in Library
The tags exist on every recipe but there's no UI to filter by them yet. A horizontal scroll of tag chips below the search bar — tap "breakfast" or "high protein" and the grid filters instantly. One session.

### Copy Day in Planner
A "Copy to..." button on any planned day that duplicates all meal slots to another day. Big quality-of-life for people who eat the same thing multiple days a week or meal prep. One session.

### PWA Install Prompt
An in-app banner or settings row that nudges users to "Add to Home Screen." iOS requires manual steps but we can detect if the app is running in browser vs standalone mode and show guidance accordingly. Half a session.

### Recipe Count Badge
Show the total number of saved recipes somewhere subtle in the library header. Small but satisfying.

---

## 🟡 Medium Builds — Higher Value, More Work

### Shopping List Generator
Select one or more recipes → generate a combined ingredient list, grouped by category (produce, proteins, pantry, dairy, etc.). Quantities combine when the same ingredient appears in multiple recipes. Check off items as you shop. Two sessions.

### Tag Filtering + Sort Options
Beyond the chip strip — add sort options to the library: newest, alphabetical, by calorie count, by protein. Pairs with tag filter. One session.

### Nutrition Label View
Full FDA-style nutrition fact panel on each recipe detail page. Pulls from stored macros, adds optional fields for fiber, sugar, sodium. Good for anyone tracking seriously. One session.

### Multiple Week Navigation
The planner is locked to the current week. Previous/next week arrows would make it a real long-term planning tool. Store meal plans keyed by week so history persists. One to two sessions.

### Recipe Photo Support
Let users add a photo to a recipe — either from their camera roll or auto-fetched from the URL import. Stored as base64 in localStorage (with a size cap). Displayed in detail view and optionally on cards. Two sessions.

### Swipe to Delete
Swipe left on a recipe card or meal slot item to reveal a delete button. Native mobile feel. One session.

### Serving Size Memory
Remember the last serving count used for each recipe instead of always defaulting to the base servings. Small but useful for people who always cook for the same number.

---

## 🔵 Bigger Features — Meaningful Scope

### Stripe + $50.50 Payment Flow
One-time $2 payment. 50% goes to food-based charities (Feeding America, No Kid Hungry, local food banks — user's choice). Unlocks: unlimited recipes (free tier caps at 10), URL import, all themes, export.

Implementation:
- `netlify/functions/create-checkout.js` — creates Stripe Checkout session
- `netlify/functions/stripe-webhook.js` — validates payment, generates license key, emails it
- `netlify/functions/validate-key.js` — checks key against Netlify Blobs
- Settings UI for "Unlock Mise" CTA and key entry
- Recipe gate at 10+ recipes with friendly upsell

No accounts. The license key is the account. Two to three sessions.

### Cloud Sync via Netlify Identity + Blobs
Optional account for people who want their recipes across devices. Netlify Identity handles auth (signup/login, JWT), Netlify Blobs stores the data. Recipes and meal plan sync on login.

Free tier: 1,000 active users/month. Would pair with the Stripe payment so paid users get sync.

Three to four sessions.

### Weekly Email Digest
A Netlify Scheduled Function that runs every Monday morning. Sends a summary of the week's planned meals and macro totals to opted-in users. Requires Netlify Identity (for user emails) and a transactional email provider (Resend is the cleanest option, generous free tier).

Two sessions.

### Import from URL — Expanded Support
Some sites (NYT Cooking behind paywall, Instagram posts, TikTok recipe videos) can't be imported via URL. Options:
- Bookmarklet that extracts recipe data from the current page and sends it to Mise
- Share sheet integration on iOS (share a page directly to Mise)
- Manual "paste from clipboard" button that tries to parse whatever's in clipboard

### Barcode Scanner for Macros
Use the device camera to scan a food barcode → look up nutrition info via Open Food Facts API (free, no key required) → pre-fill macros when adding a quick meal to the planner. One to two sessions once the camera API integration is scoped.

---

## 🟣 Themes — Infrastructure Already Done

The CSS variable system and Settings UI are in place. Each theme just needs its own variable set wired up.

| Theme | Status | Notes |
|---|---|---|
| Ember | ✅ Done | Warm charcoal + amber. The default. |
| Midnight | ✅ Done | Deep navy + electric blue |
| Garden | ✅ Done | Light parchment + forest green |
| Dusk | ✅ Done | Deep plum + soft lavender |
| Flame | ✅ Done | True black + hot orange |
| Spice | ✅ Done | Warm cream + terracotta |
| Stone | 📋 Planned | Cool gray + slate. Minimal, editorial. |
| Umami | 📋 Planned | Deep brown + golden yellow. Rich and warm. |
| Coastal | 📋 Planned | Off-white + teal. Light mode, fresh. |

---

## 💡 Longer-Term Ideas (No Timeline)

- **Recipe scaling notes** — let users add notes per serving count ("at 6 servings, use a larger pan")
- **Cook mode** — distraction-free step-by-step view with the screen staying on
- **Timer integration** — detect time-based steps ("simmer 25 minutes") and add a tap-to-start timer
- **Meal plan templates** — save a full week as a template and reapply it
- **Nutritional goals by day type** — different macro targets for rest days vs training days
- **Friend sharing** — share a recipe via link (read-only, no account required for recipient)
- **Grocery store integration** — export shopping list directly to Instacart or AnyList
- **AI-powered suggestions** — "what can I make with chicken, rice, and spinach?" using Claude API (opt-in, requires connection)
- **Recipe versioning** — track changes when you edit a recipe, revert if needed
- **Cuisine tags + global search** — auto-tag recipes by cuisine type based on ingredients and title

---

## Known Issues / Tech Debt

- [ ] Food Network and some Cloudflare-protected sites still block URL import — may need a rotating proxy or paid scraping service for full coverage
- [ ] localStorage has a ~5MB cap — recipe photos would push toward this limit quickly. Blobs or IndexedDB would be needed for photo support.
- [ ] Service worker cache invalidation — currently version-bumped manually in `sw.js`. Should automate this with a build hash.
- [ ] No error boundary — a JS error in any module silently breaks the whole app. Add a top-level error handler that shows a friendly recovery screen.
- [ ] Ingredient parser struggles with descriptive phrases ("1 large onion, roughly chopped" sometimes parses "large onion" instead of "onion"). Needs a post-processing cleanup pass.

---

*Last updated: May 2026*
*Built by Nobody Studios — nobodycreative.com*
