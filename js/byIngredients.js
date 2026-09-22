const typingInput = document.getElementById('firstinputsection');

const MatchingShoppingList = document.querySelector('.MatchingShoppingList');

const MissingShoppingList = document.querySelector('.MissingShoppingList');

let typingTimer;

const typingInterval = 500;

const recipeContainerDiv = document.querySelector('.reciperesults');

typingInput.addEventListener('input', () => {                           // add event listener for when someone starts typing
    clearTimeout(typingTimer);
    typingTimer = setTimeout(donetypingfunc, typingInterval);
})

document.addEventListener('change', function (event) {
    if (event.target && event.target.classList.contains('shoppingcheckbox')) {
        const checkbox = event.target;

        const parentDiv = checkbox.closest('.shoppingitem');

        if (checkbox.checked) {
            MissingShoppingList.appendChild(parentDiv);
            //alert(`Маркирахте: ${checkbox.value}`);
        } else {
            MatchingShoppingList.appendChild(parentDiv);
            //alert(`Премахнахте: ${checkbox.value}`);
        }
    }
});

function handleChooseBtnClick(ingredientsList) {
    const inputValue = firstinputsection.value
    const seperatedInputValue = inputValue.split(',').map(item => item.trim().toLowerCase());

    const recipesIngredients = ingredientsList.map(item => item.trim().toLowerCase());

    const matchingIngredients = recipesIngredients.filter(ingredient =>
        seperatedInputValue.some(input => ingredient.includes(input))
    )
    const nonMatchingIngredients = recipesIngredients.filter(ingredient =>
        !seperatedInputValue.some(input => ingredient.includes(input))
    )

    document.querySelector('.MatchingShoppingList').innerHTML = ''; // to remove the old stuff
    document.querySelector('.MissingShoppingList').innerHTML = ''; // to remove the old stuff

    matchingIngredients.forEach(ingredient => {
        const newDiv = document.createElement('div');
        newDiv.className = 'shoppingitem';
        newDiv.innerHTML = `<input type="checkbox" class="shoppingcheckbox" checked><a> ${ingredient}</a>`

        document.querySelector('.MissingShoppingList').appendChild(newDiv);
    });

    nonMatchingIngredients.forEach(ingredient => {
        const newDiv = document.createElement('div');
        newDiv.className = 'shoppingitem';
        newDiv.innerHTML = `<input type="checkbox" class="shoppingcheckbox"><a> ${ingredient}</a>`

        document.querySelector('.MatchingShoppingList').appendChild(newDiv);
    });

    console.log("Matching ingredients:", matchingIngredients);
    console.log("Non-matching ingredients:", nonMatchingIngredients);
}

function donetypingfunc() {
    console.log("The user stopped typing.");
    const userInput = typingInput.value;
    if (!userInput.trim()) {
        recipeContainerDiv.innerHTML = '';
        return;
    }
    fetch('/recipes/search/by-ingredients?q=' + encodeURIComponent(userInput) + '&allow_missing_ingredients=false') /* temporarily set to false */
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
                let ingredientsList = [];
                try {
                    ingredientsList = typeof recipe.ingredient_lines === 'string' ? JSON.parse(recipe.ingredient_lines) : recipe.ingredient_lines;
                } catch (e) {
                    ingredientsList = [];
                }

                amountOfRecipes++;
                if (amountOfRecipes > 10) {
                    return;
                }

                let fullIngridientsString;

                ingredientsList.forEach((ingredient, index) => {
                    if (fullIngridientsString === undefined) {
                        fullIngridientsString = ingredient;
                    }
                    else {
                        fullIngridientsString += ', ' + ingredient;
                    }
                })

                const recipeCard = document.createElement('div');
                recipeCard.className = 'reciperesult';

                const jsonEscaped = JSON.stringify(ingredientsList).replace(/"/g, '&quot;')
                recipeCard.innerHTML = `
                        <img class="recipeImg" src="${recipe.image_url}" alt="${recipe.recipe_name}">
                        <a>${recipe.recipe_name} </a>
                        <hr>
                        <a>${fullIngridientsString}</a>
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