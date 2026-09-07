const typingInput = document.getElementById('firstinputsection');

const MatchingShoppingList = document.querySelector('.MatchingShoppingList');

const MissingShoppingList = document.querySelector('.MissingShoppingList');

let typingTimer;

const typingInterval = 500;

const recipeContainerDiv = document.querySelector('.reciperesults');

typingInput.addEventListener('input', () => {                      // add event listener for when someone starts typing
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

function handleChooseBtnClick(ingredientsList) {                    // handles which recipe you choose
    const inputValue = firstinputsection.value
    const seperatedInputValue = inputValue.split(',').map(item => item.trim().toLowerCase());

    const recipesIngredients = ingredientsList.map(item => item.trim().toLowerCase());

    const matchingIngredients = recipesIngredients.filter(recipe =>
        seperatedInputValue.some(input => recipe.includes(input))
    )
    const nonMatchingIngredients = recipesIngredients.filter(recipe =>
        !seperatedInputValue.some(input => recipe.includes(input))
    )

    document.querySelector('.MatchingShoppingList').innerHTML = ''; // to remove the old stuff
    document.querySelector('.MissingShoppingList').innerHTML = ''; // to remove the old stuff

    matchingIngredients.forEach(recipe => {                // adds the found items
        const newDiv = document.createElement('div');
        newDiv.className = 'shoppingitem';
        newDiv.innerHTML = `<input type="checkbox" class="shoppingcheckbox" checked><a> ${recipe}</a>`

        document.querySelector('.MissingShoppingList').appendChild(newDiv);
    });

    nonMatchingIngredients.forEach(recipe => {
        const newDiv = document.createElement('div');
        newDiv.className = 'shoppingitem';
        newDiv.innerHTML = `<input type="checkbox" class="shoppingcheckbox"><a> ${recipe}</a>`

        document.querySelector('.MatchingShoppingList').appendChild(newDiv);
    });

    console.log("Matching ingredients:", matchingIngredients);
    console.log("Non-matching ingredients:", nonMatchingIngredients);
}

function donetypingfunc() {
    console.log("Potrebitelq sprq da pishe");
    const texta = typingInput.value;
    if (!texta.trim()) {
        recipeContainerDiv.innerHTML = '';
        return;
    }
    fetch('/recipes/search?q=' + encodeURIComponent(texta) + '&allow_missing_ingredients=true') /* Temporarily set to false */
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
                    ingredientsList = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients;
                } catch (e) {
                    ingredientsList = [];
                }

                amountOfRecipes++;
                if (amountOfRecipes > 10) {
                    return;
                }

                let fullIngridientsString;

                ingredientsList.forEach((recipe, index) => {
                    if (fullIngridientsString === undefined) {
                        fullIngridientsString = recipe;
                    }
                    else {
                        fullIngridientsString += ', ' + recipe;
                    }
                })

                const recipeCard = document.createElement('div');
                recipeCard.className = 'reciperesult';

                const jsonEscaped = JSON.stringify(ingredientsList).replace(/"/g, '&quot;')
                recipeCard.innerHTML = `
                    <a>${recipe.title} </a>
                    <hr>
                    <a>${fullIngridientsString}</a>
                    <div class="reciperesultbuttons">
                        <button onclick="window.open('https://${recipe.link}', '_blank')">View Result</button>
                        <button onclick="handleChooseBtnClick(${jsonEscaped})" id="chooseBtn">Choose</button>
                        <button>Favorite *</button>
                    </div>
            `;

                recipeContainerDiv.appendChild(recipeCard);
            });

            console.log(data);
        });
}