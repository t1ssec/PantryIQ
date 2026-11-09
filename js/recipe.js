const { utils } = window.PantryIQ;
const recipeDetail = document.querySelector('.recipeDetail');
const recipeMessage = document.querySelector('.recipePageMessage');
const recipeName = new URLSearchParams(window.location.search).get('name');
let recipeRecord;
let recipeRenderId = 0;

document.addEventListener('pantry-language-change', () => {
    if (recipeRecord) {
        renderRecipe();
    }
});

loadRecipe();

async function loadRecipe() {
    if (!recipeName) {
        showRecipeMessage('recipeNotFound');
        return;
    }

    try {
        const response = await fetch(`/recipes/detail?name=${encodeURIComponent(recipeName)}`);
        if (response.status === 404) {
            showRecipeMessage('recipeNotFound');
            return;
        }
        if (!response.ok) {
            throw new Error('Could not load recipe');
        }

        const data = await response.json();
        recipeRecord = data.recipe;
        renderRecipe();
    } catch (error) {
        showRecipeMessage('recipeLoadError');
    }
}

async function renderRecipe() {
    const renderId = ++recipeRenderId;
    const [recipe] = await utils.localizeRecipes([recipeRecord]);
    if (renderId !== recipeRenderId) {
        return;
    }

    const title = document.querySelector('.recipeDetailTitle');
    const image = document.querySelector('.recipeDetailImage');
    const description = document.querySelector('.recipeDetailDescription');
    const sourceLink = document.querySelector('.originalSourceLink');
    const ingredientList = document.querySelector('.recipeIngredientList');

    title.textContent = recipe.displayName;
    image.src = recipe.image_url || '';
    image.alt = recipe.displayName;
    image.hidden = !recipe.image_url;

    const descriptionIngredients = recipe.displayIngredients.slice(0, 5).join(', ');
    description.textContent = descriptionIngredients
        ? `${window.PantryIQ.language.text('madeWith')} ${descriptionIngredients}`
        : '';

    document.querySelector('.recipeServings').textContent = recipe.servings || '—';
    const calories = Number(recipe.calories);
    document.querySelector('.recipeCalories').textContent = Number.isFinite(calories)
        ? `${Math.round(calories)} kcal`
        : '—';

    ingredientList.replaceChildren();
    recipe.displayIngredients.forEach(ingredient => {
        const item = document.createElement('li');
        item.textContent = ingredient;
        ingredientList.appendChild(item);
    });

    const sourceUrl = typeof recipe.url === 'string' && /^https?:\/\//i.test(recipe.url)
        ? recipe.url
        : `https://${recipe.url || ''}`;
    try {
        const parsedSourceUrl = new URL(sourceUrl);
        sourceLink.href = ['http:', 'https:'].includes(parsedSourceUrl.protocol) ? parsedSourceUrl.href : '';
        sourceLink.hidden = !sourceLink.href;
    } catch (error) {
        sourceLink.hidden = true;
    }
    document.querySelector('.recipeSourceName').textContent = recipe.source ? ` (${recipe.source})` : '';

    document.title = `${recipe.displayName} - PantryIQ`;
    recipeMessage.hidden = true;
    recipeDetail.hidden = false;
}

function showRecipeMessage(messageKey) {
    recipeDetail.hidden = true;
    recipeMessage.textContent = window.PantryIQ.language.text(messageKey);
    recipeMessage.hidden = false;
}
