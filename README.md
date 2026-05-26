# Mise.

**Your kitchen, organized.**

A local-first recipe keeper and meal planner built as a mobile PWA. Save any recipe, plan your week, track macros — all offline, no account required, no data leaving your device.

Built by [Nobody Studios](https://github.com/nobodycreative).

---

## What It Does

**Recipe Library**
- Save recipes by pasting text from anywhere — blogs, AllRecipes, messages, screenshots. The parser extracts title, ingredients, steps, and servings automatically.
- Import directly from a recipe URL (AllRecipes, Food Network, Serious Eats, BBC Good Food, and most major recipe sites via schema.org/Recipe).
- Build recipes from scratch with a structured form — ingredients, steps, macros, tags, emoji icon.
- Scale any recipe up or down with the serving scaler — amounts recalculate instantly including fractions.
- Add macros per serving (calories, protein, carbs, fat).

**Meal Planner**
- Weekly calendar view — slot saved recipes into Breakfast, Lunch, Dinner, or Snack for any day.
- Quick-add meals without a recipe (great for restaurant meals, protein shakes, etc.).
- Daily macro totals aggregate automatically from planned meals.
- Set daily calorie and macro goals — progress bars show where you stand.
- Weekly summary strip shows your whole week at a glance — green when you're on goal, red when over.

**Settings**
- 6 themes: Ember (default), Midnight, Garden, Dusk, Flame, Spice.
- Export all your recipes and meal plan as a JSON backup.
- Onboarding walkthrough (replayable from Settings).

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| App | Vanilla JS + CSS | No build step, no framework overhead, instant Netlify deploy |
| Storage | localStorage | Local-first, works offline, no backend needed |
| Hosting | Netlify | Free tier, functions, edge, all from one repo |
| URL Import | Netlify Function (Node.js) | Server-side fetch bypasses browser CORS |
| PWA | Web App Manifest + Service Worker | Installable on iOS and Android, full offline support |
| Fonts | DM Serif Display + DM Mono + Lato | Loaded from Google Fonts |

---

## Project Structure

```
mise-netlify/
├── netlify.toml                    # Build config, headers, redirects
├── netlify/
│   └── functions/
│       └── fetch-recipe.js         # URL import — fetches + parses recipe pages
└── public/
    ├── index.html                  # App shell — HTML structure only
    ├── manifest.json               # PWA manifest
    ├── sw.js                       # Service worker — offline caching
    ├── css/
    │   ├── themes.css              # All 6 theme CSS variable sets
    │   └── app.css                 # All component styles
    ├── js/
    │   ├── data.js                 # State, localStorage, seed data
    │   ├── library.js              # Recipe grid, search, filter
    │   ├── detail.js               # Recipe detail, serving scaler, delete
    │   ├── form.js                 # Add/edit sheet, ingredients, steps, tags
    │   ├── parser.js               # Paste parser + URL import client logic
    │   ├── planner.js              # Week grid, day view, macros, meal slots
    │   ├── settings.js             # Onboarding, themes, export, clear data
    │   └── app.js                  # Routing, nav, toast, SW registration, init
    └── icons/
        └── icon-[32-1024].png      # PWA icons — all sizes
```

---

## Deploy

**One-click via Netlify:**

1. Fork or push this repo to GitHub
2. Go to [netlify.com](https://netlify.com) → New site from Git
3. Select your repo — Netlify reads `netlify.toml` automatically
4. Deploy — done

No build command needed. No environment variables required for the base app.

**URL Import (optional):**

The `fetch-recipe` function deploys automatically with the site. No setup required — it just works once the site is on Netlify.

---

## Local Development

The app works as a static file locally for everything except URL import (which requires the Netlify function):

```bash
# Option 1 — open directly
open public/index.html

# Option 2 — serve with any static server
npx serve public

# Option 3 — use Netlify CLI for full function support
npm install -g netlify-cli
netlify dev
```

---

## Data & Privacy

Everything lives in your browser's `localStorage`. No analytics. No tracking. No server ever sees your recipes or meal plan. The only network request is the URL import function call — which fetches the third-party recipe page server-side and returns the parsed data. Nothing is stored.

Exporting your data (Settings → Export recipes) gives you a full JSON backup of everything.

---

## Roadmap

See [IDEAS.md](./IDEAS.md) for the full list. High-level priorities:

- [ ] Tag filtering in the recipe library
- [ ] Copy a day's meal plan to another day
- [ ] Shopping list generator from selected recipes
- [ ] Stripe / $50.50 one-time payment + charity split
- [ ] Additional themes (infrastructure already in place)
- [ ] Recipe photo support
- [ ] Multiple week navigation in the planner
- [ ] PWA install prompt (in-app nudge)

---

## License

MIT. Build on it, fork it, make it yours.

---

*Mise — from "mise en place." Everything in its place.*
