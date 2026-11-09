const { config, utils } = window.PantryIQ;

const typingInput = document.getElementById('firstinputsection');
const MatchingShoppingList = document.querySelector('.MatchingShoppingList');
const MissingShoppingList = document.querySelector('.MissingShoppingList');
const recipeContainerDiv = document.querySelector('.reciperesults');
const paginationDiv = document.querySelector('.recipePagination');
const pageStatus = document.querySelector('.recipePageStatus');
const previousPageButton = document.querySelector('[data-page-action="previous"]');
const nextPageButton = document.querySelector('[data-page-action="next"]');

let typingTimer;
let searchRequestId = 0;
let currentPage = 1;
let totalPages = 0;
let searchInputLanguage = window.PantryIQ.language.current;
const recipesByName = new Map();
const typingInterval = config.typingDelay;

async function handleChooseBtnClick(ingredientsList) {
    const inputValue = typingInput.value;
    const [displayQuery] = await window.PantryIQ.language.translateValues(
        [inputValue], searchInputLanguage, window.PantryIQ.language.current
    );
    const separatedInputValue = utils.normalizeIngredientList(displayQuery.split(','));
    const recipeIngredients = utils.normalizeIngredientList(ingredientsList);

    const matchingIngredients = recipeIngredients.filter(ingredient =>
        separatedInputValue.some(input => ingredient.includes(input))
    );
    const nonMatchingIngredients = recipeIngredients.filter(ingredient =>
        !separatedInputValue.some(input => ingredient.includes(input))
    );

    utils.renderShoppingLists(nonMatchingIngredients, matchingIngredients, MatchingShoppingList, MissingShoppingList);
}

typingInput.addEventListener('input', () => {
    searchInputLanguage = window.PantryIQ.language.current;
    currentPage = 1;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(donetypingfunc, typingInterval);
});

paginationDiv.addEventListener('click', event => {
    if (!(event.target instanceof Element)) {
        return;
    }
    const button = event.target.closest('[data-page-action]');
    if (!button || button.disabled) {
        return;
    }

    clearTimeout(typingTimer);
    currentPage += button.dataset.pageAction === 'next' ? 1 : -1;
    donetypingfunc();
});

document.addEventListener('change', function (event) {
    if (event.target && event.target.classList.contains('shoppingcheckbox')) {
        const checkbox = event.target;
        const parentDiv = checkbox.closest('.shoppingitem');

        if (checkbox.checked) {
            MissingShoppingList.appendChild(parentDiv);
        } else {
            MatchingShoppingList.appendChild(parentDiv);
        }
    }
});

recipeContainerDiv.addEventListener('click', event => {
    if (!(event.target instanceof Element)) {
        return;
    }

    const button = event.target.closest('.recipeFavorite');
    if (!(button instanceof HTMLButtonElement)) {
        return;
    }

    const foodName = button.dataset.foodName;
    const isFavorite = utils.toggleFavorite(recipesByName.get(foodName) || foodName);
    button.setAttribute('aria-pressed', String(isFavorite));
    button.setAttribute('aria-label', window.PantryIQ.language.text(isFavorite ? 'removeFavorite' : 'addFavorite'));
    button.textContent = isFavorite ? '♥' : '♡';
});

document.addEventListener('pantry-language-change', () => {
    clearTimeout(typingTimer);
    donetypingfunc();
});

async function donetypingfunc() {
    const requestId = ++searchRequestId;
    const userInput = typingInput.value;

    if (!userInput.trim()) {
        totalPages = 0;
        updatePagination();
        recipeContainerDiv.innerHTML = `<p class="info" data-i18n="searchPrompt">${window.PantryIQ.language.text('searchPrompt')}</p>`;
        return;
    }

    try {
        const searchQuery = await utils.translateSearchQuery(userInput, searchInputLanguage);
        const response = await fetch('/recipes/search/name?q=' + encodeURIComponent(searchQuery) + '&page=' + currentPage);
        const data = await response.json();
        if (requestId !== searchRequestId) {
            return;
        }

        if (!data.recipes || data.recipes.length === 0) {
            totalPages = 0;
            updatePagination();
            recipeContainerDiv.innerHTML = `
                <div class="recipeEmpty">
                    <p>${window.PantryIQ.language.text('noRecipes')}</p>
                    <p>${window.PantryIQ.language.text('tryRecipeSearch')}</p>
                </div>
            `;
            return;
        }

        currentPage = data.page || currentPage;
        totalPages = data.total_pages || 0;
        updatePagination();
        const recipes = await utils.localizeRecipes(data.recipes);
        if (requestId !== searchRequestId) {
            return;
        }
        renderRecipes(recipes);
    } catch (error) {
        if (requestId !== searchRequestId) {
            return;
        }
        totalPages = 0;
        updatePagination();
        recipeContainerDiv.innerHTML = `<p class="info">${window.PantryIQ.language.text('noRecipes')}</p>`;
    }
}

function updatePagination() {
    paginationDiv.hidden = totalPages <= 1;
    previousPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
    pageStatus.textContent = `${window.PantryIQ.language.text('pageLabel')} ${currentPage} ${window.PantryIQ.language.text('pageOf')} ${totalPages}`;
}

function renderRecipes(recipes) {
    recipeContainerDiv.replaceChildren();
    recipesByName.clear();
    const favorites = utils.getFavoriteNames();

    recipes.forEach(recipe => {
        recipesByName.set(recipe.recipe_name, recipe);
        const recipeCard = document.createElement('div');
        recipeCard.className = 'reciperesult';

        const recipeMedia = document.createElement('div');
        recipeMedia.className = 'recipeMedia';
        const recipeImage = document.createElement('img');
        recipeImage.className = 'recipeImg';
        recipeImage.src = recipe.image_url;
        recipeImage.alt = recipe.displayName;

        const favoriteButton = document.createElement('button');
        const isFavorite = favorites.includes(recipe.recipe_name);
        favoriteButton.className = 'recipeFavorite';
        favoriteButton.type = 'button';
        favoriteButton.dataset.foodName = recipe.recipe_name;
        favoriteButton.setAttribute('aria-label', window.PantryIQ.language.text(isFavorite ? 'removeFavorite' : 'addFavorite'));
        favoriteButton.setAttribute('aria-pressed', String(isFavorite));
        favoriteButton.textContent = isFavorite ? '♥' : '♡';
        recipeMedia.append(recipeImage, favoriteButton);

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
        const chooseButton = document.createElement('button');
        chooseButton.type = 'button';
        chooseButton.textContent = window.PantryIQ.language.text('chooseRecipe');
        chooseButton.addEventListener('click', () => handleChooseBtnClick(recipe.displayIngredients));
        buttons.append(viewButton, chooseButton);
        content.append(title, description, buttons);
        recipeCard.append(recipeMedia, content);
        recipeContainerDiv.appendChild(recipeCard);
    });
}
