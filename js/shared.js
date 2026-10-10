window.PantryIQ = window.PantryIQ || {};

window.PantryIQ.config = {
    typingDelay: 500,
    recipeLimit: 10,
};

window.PantryIQ.utils = {
    normalizeIngredientList(ingredients) {
        return ingredients
            .map(item => item.trim().toLowerCase())
            .filter(item => item.length > 0);
    },

    createShoppingItem(ingredient, isChecked) {
        const newDiv = document.createElement('div');
        newDiv.className = 'shoppingitem';
        newDiv.innerHTML = `<input type="checkbox" class="shoppingcheckbox" ${isChecked ? 'checked' : ''}><a> ${ingredient}</a>`;
        return newDiv;
    },

    renderShoppingLists(matchingIngredients, missingIngredients, matchingList, missingList) {
        matchingList.innerHTML = '';
        missingList.innerHTML = '';

        missingIngredients.forEach(ingredient => {
            missingList.appendChild(this.createShoppingItem(ingredient, true));
        });

        matchingIngredients.forEach(ingredient => {
            matchingList.appendChild(this.createShoppingItem(ingredient, false));
        });
    },

    parseIngredientLines(recipe) {
        try {
            return typeof recipe.ingredient_lines === 'string'
                ? JSON.parse(recipe.ingredient_lines)
                : recipe.ingredient_lines;
        } catch (error) {
            return [];
        }
    },

    buildRecipeIngredientsString(ingredientsList) {
        let fullIngredientsString;

        ingredientsList.forEach(ingredient => {
            if (fullIngredientsString === undefined) {
                fullIngredientsString = ingredient;
            } else {
                fullIngredientsString += ', ' + ingredient;
            }
        });

        return fullIngredientsString;
    },
};