const { config, utils } = window.PantryIQ;

const typingInput = document.getElementById('firstinputsection');
const MatchingShoppingList = document.querySelector('.MatchingShoppingList');
const MissingShoppingList = document.querySelector('.MissingShoppingList');
const recipeContainerDiv = document.querySelector('.reciperesults');

let typingTimer;
const typingInterval = config.typingDelay;

function handleChooseBtnClick(ingredientsList) {
    const inputValue = typingInput.value;
    const separatedInputValue = utils.normalizeIngredientList(inputValue.split(','));
    const recipeIngredients = utils.normalizeIngredientList(ingredientsList);

    const matchingIngredients = recipeIngredients.filter(ingredient =>
        separatedInputValue.some(input => ingredient.includes(input))
    );
    const nonMatchingIngredients = recipeIngredients.filter(ingredient =>
        !separatedInputValue.some(input => ingredient.includes(input))
    );

    utils.renderShoppingLists(nonMatchingIngredients, matchingIngredients, MatchingShoppingList, MissingShoppingList);

    console.log('Matching ingredients:', matchingIngredients);
    console.log('Non-matching ingredients:', nonMatchingIngredients);
}

typingInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(donetypingfunc, typingInterval);
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

    const isFavorite = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!isFavorite));
    button.setAttribute('aria-label', isFavorite ? 'Add to favorites' : 'Remove from favorites');
    button.textContent = isFavorite ? '♡' : '♥';
});

function donetypingfunc() {
    console.log('The user stopped typing.');
    const userInput = typingInput.value;

    if (!userInput.trim()) {
        recipeContainerDiv.innerHTML = '';
        return;
    }

    fetch('/recipes/search?q=' + encodeURIComponent(userInput) + '&allow_missing_ingredients=true')
        .then(response => response.json())
        .then(data => {
            recipeContainerDiv.innerHTML = '';

            if (!data.recipes || data.recipes.length === 0) {
                recipeContainerDiv.innerHTML = `
                <div class="recipeEmpty">
                    <p>No recipes found</p>
                    <p>Try searching for a different recipe name.</p>
                </div>
            `;
                return;
            }

            let amountOfRecipes = 0;

            data.recipes.forEach(recipe => {
                const ingredientsList = utils.parseIngredientLines(recipe);

                amountOfRecipes++;
                if (amountOfRecipes > config.recipeLimit) {
                    return;
                }

                const fullIngredientsString = utils.buildRecipeIngredientsString(ingredientsList);
                const recipeCard = document.createElement('div');
                recipeCard.className = 'reciperesult';

                const jsonEscaped = JSON.stringify(ingredientsList).replace(/"/g, '&quot;');
                recipeCard.innerHTML = `
                    <div class="recipeMedia">
                        <img class="recipeImg" src="${recipe.image_url}" alt="${recipe.recipe_name}">
                        <button class="recipeFavorite" type="button" aria-label="Add to favorites" aria-pressed="false">♡</button>
                    </div>
                    <div class="recipeCardContent">
                        <h2 class="recipeTitle">${recipe.recipe_name}</h2>
                        <p class="recipeDescription">${fullIngredientsString}</p>
                        <div class="reciperesultbuttons">
                            <button onclick="window.open('https://${recipe.url}', '_blank')">View Result</button>
                            <button onclick="handleChooseBtnClick(${jsonEscaped})" id="chooseBtn">Choose</button>
                        </div>
                    </div>
            `;

                recipeContainerDiv.appendChild(recipeCard);
            });

            console.log(data);
        });
}