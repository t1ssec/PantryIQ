const { utils } = window.PantryIQ;
const favoriteContainer = document.querySelector('.favrecipes');
let favoriteRenderId = 0;

favoriteContainer.addEventListener('click', event => {
    if (!(event.target instanceof Element)) {
        return;
    }

    const button = event.target.closest('.recipeFavorite');
    if (!(button instanceof HTMLButtonElement)) {
        return;
    }

    utils.toggleFavorite(button.dataset.foodName);
    renderFavorites();
});

document.addEventListener('pantry-language-change', renderFavorites);
renderFavorites();

async function renderFavorites() {
    const renderId = ++favoriteRenderId;
    const favoriteNames = utils.getFavoriteNames();
    if (favoriteNames.length === 0) {
        favoriteContainer.innerHTML = `<p class="info">${window.PantryIQ.language.text('noFavorites')}</p>`;
        return;
    }

    const favoriteRecipes = utils.getFavoriteRecipes();
    const missingNames = favoriteNames.filter(name => !favoriteRecipes[name]);
    if (missingNames.length > 0) {
        try {
            const response = await fetch('/recipes/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipe_names: missingNames })
            });
            if (!response.ok) {
                throw new Error('Could not load saved recipes');
            }
            const data = await response.json();
            data.recipes.forEach(recipe => {
                favoriteRecipes[recipe.recipe_name] = recipe;
            });
            localStorage.setItem('favoriteRecipes', JSON.stringify(favoriteRecipes));
        } catch (error) {
            favoriteContainer.innerHTML = `<p class="info">${window.PantryIQ.language.text('favoritesLoadError')}</p>`;
            return;
        }
    }

    const recipes = favoriteNames.map(name => favoriteRecipes[name]).filter(Boolean);
    const localizedRecipes = await utils.localizeRecipes(recipes);
    if (renderId !== favoriteRenderId) {
        return;
    }

    favoriteContainer.replaceChildren();
    localizedRecipes.forEach(recipe => {
        const recipeCard = document.createElement('div');
        recipeCard.className = 'reciperesult';

        const recipeMedia = document.createElement('div');
        recipeMedia.className = 'recipeMedia';
        const recipeImage = document.createElement('img');
        recipeImage.className = 'recipeImg';
        recipeImage.src = recipe.image_url;
        recipeImage.alt = recipe.displayName;

        const removeButton = document.createElement('button');
        removeButton.className = 'recipeFavorite';
        removeButton.type = 'button';
        removeButton.dataset.foodName = recipe.recipe_name;
        removeButton.setAttribute('aria-label', window.PantryIQ.language.text('removeFavorite'));
        removeButton.setAttribute('aria-pressed', 'true');
        removeButton.textContent = '♥';
        recipeMedia.append(recipeImage, removeButton);

        const content = document.createElement('div');
        content.className = 'recipeCardContent';
        const title = document.createElement('h2');
        title.className = 'recipeTitle';
        title.textContent = recipe.displayName;
        const description = document.createElement('p');
        description.className = 'recipeDescription';
        description.textContent = utils.buildRecipeIngredientsString(recipe.displayIngredients) || '';

        const buttons = document.createElement('div');
        buttons.className = 'reciperesultbuttons';
        const viewButton = document.createElement('button');
        viewButton.type = 'button';
        viewButton.textContent = window.PantryIQ.language.text('viewRecipe');
        viewButton.addEventListener('click', () => {
            window.location.href = `/recipe?name=${encodeURIComponent(recipe.recipe_name)}`;
        });
        buttons.appendChild(viewButton);
        content.append(title, description, buttons);
        recipeCard.append(recipeMedia, content);
        favoriteContainer.appendChild(recipeCard);
    });

    if (localizedRecipes.length === 0) {
        favoriteContainer.innerHTML = `<p class="info">${window.PantryIQ.language.text('noFavorites')}</p>`;
    }
}
