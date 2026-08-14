const typingInput = document.getElementById('firstinputsection');

let typingTimer;

const typingInterval = 500;

const recipeContainerDiv = document.querySelector('.reciperesults');

typingInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(donetypingfunc, typingInterval);
})

function donetypingfunc() {
    console.log("Potrebitelq sprq da pishe");
    const texta = typingInput.value;
    if (!texta.trim()) {
        recipeContainerDiv.innerHTML = '';
        return;
    }
    fetch('/recipes/search/by-ingredients?search=' + encodeURIComponent(texta) + '&allow_missing_ingredients=false') /* Temporarily set to false */
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

            recipeCard.innerHTML = `
                    <a>🍲 ${recipe.title} </a>
                    <a>${fullIngridientsString}</a>
                    <div class="reciperesultbuttons">
                        <button onclick="window.open('https://${recipe.link}', '_blank')">View Result</button>
                        <button id="chooseBtn">Choose</button>
                        <button>Favorite *</button>
                    </div>
            `;

            recipeContainerDiv.appendChild(recipeCard);
        });

        console.log(data);
    });
}