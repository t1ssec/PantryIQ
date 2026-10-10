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
                <div class="reciperesult">
                    <a>No recipes found</a>
                    <a>Try searching for different ingredients</a>
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
                    <img class="recipeImg" src="${recipe.image_url}" alt="${recipe.recipe_name}">
                        <a>${recipe.recipe_name} </a>
                        <hr>
                        <a>${fullIngredientsString}</a>
                        <div class="reciperesultbuttons">
                            <button onclick="window.open('https://${recipe.url}', '_blank')">View Result</button>
                            <button onclick="handleChooseBtnClick(${jsonEscaped})" id="chooseBtn">Choose</button>
                            <button>Favorite *</button>
                        </div>
            `;

                recipeContainerDiv.appendChild(recipeCard);
            });

            console.log(data);
        });
}