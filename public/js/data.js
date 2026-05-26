// ── data.js ──────────────────────────────────────────────────────────────────
// Central state and localStorage persistence

let recipes  = JSON.parse(localStorage.getItem('mise_recipes')  || '[]');
let mealPlan = JSON.parse(localStorage.getItem('mise_mealplan') || '{}');
let goals    = JSON.parse(localStorage.getItem('mise_goals')    || '{"cal":2000,"protein":150,"carbs":200,"fat":65}');

function save()      { localStorage.setItem('mise_recipes',  JSON.stringify(recipes));  }
function savePlan()  { localStorage.setItem('mise_mealplan', JSON.stringify(mealPlan)); }
function saveGoals() { localStorage.setItem('mise_goals',    JSON.stringify(goals));    }

function seedIfEmpty() {
  if (recipes.length > 0) return;
  recipes = [
    {
      id: uid(), emoji: '🥗', title: 'Greek Chicken Bowl',
      servings: 2, tags: ['lunch', 'high protein'],
      ingredients: [
        { amount: '6',  unit: 'oz',   name: 'grilled chicken breast' },
        { amount: '1',  unit: 'cup',  name: 'cucumber, diced' },
        { amount: '½',  unit: 'cup',  name: 'cherry tomatoes' },
        { amount: '¼',  unit: 'cup',  name: 'kalamata olives' },
        { amount: '2',  unit: 'tbsp', name: 'feta cheese' },
        { amount: '2',  unit: 'tbsp', name: 'olive oil' },
        { amount: '1',  unit: 'tbsp', name: 'lemon juice' },
      ],
      steps: [
        'Slice grilled chicken into strips.',
        'Combine cucumber, tomatoes, and olives in a bowl.',
        'Top with chicken and crumbled feta.',
        'Drizzle with olive oil and lemon juice. Season to taste.',
      ],
      macros: { cal: 420, protein: 38, carbs: 12, fat: 24 },
      createdAt: Date.now(),
    },
    {
      id: uid(), emoji: '🍲', title: 'Smoky Lentil Soup',
      servings: 4, tags: ['dinner', 'vegetarian'],
      ingredients: [
        { amount: '1', unit: 'cup',  name: 'red lentils' },
        { amount: '1', unit: '',     name: 'onion, diced' },
        { amount: '3', unit: '',     name: 'garlic cloves, minced' },
        { amount: '1', unit: 'tsp',  name: 'smoked paprika' },
        { amount: '1', unit: 'tsp',  name: 'cumin' },
        { amount: '4', unit: 'cups', name: 'vegetable broth' },
        { amount: '1', unit: 'can',  name: 'diced tomatoes' },
      ],
      steps: [
        'Sauté onion and garlic in olive oil over medium heat for 5 minutes.',
        'Add paprika and cumin, toast for 1 minute.',
        'Add lentils, tomatoes, and broth. Bring to a boil.',
        'Reduce heat and simmer 25 minutes until lentils are soft.',
        'Season with salt and pepper. Serve with crusty bread.',
      ],
      macros: { cal: 280, protein: 16, carbs: 44, fat: 4 },
      createdAt: Date.now(),
    },
  ];
  save();
}
