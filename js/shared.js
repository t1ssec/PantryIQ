window.PantryIQ = window.PantryIQ || {};

window.PantryIQ.config = {
    typingDelay: 500,
};

window.PantryIQ.utils = {
    normalizeIngredientList(ingredients) {
        return ingredients
            .map(item => item.trim().toLowerCase())
            .filter(item => item.length > 0);
    },

    getFavoriteNames() {
        try {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            return Array.isArray(favorites) ? favorites.filter(name => typeof name === 'string') : [];
        } catch (error) {
            return [];
        }
    },

    getFavoriteRecipes() {
        try {
            const recipes = JSON.parse(localStorage.getItem('favoriteRecipes') || '{}');
            return recipes && typeof recipes === 'object' && !Array.isArray(recipes) ? recipes : {};
        } catch (error) {
            return {};
        }
    },

    toggleFavorite(recipe) {
        const recipeName = typeof recipe === 'string' ? recipe : recipe && recipe.recipe_name;
        if (!recipeName) {
            return false;
        }

        const favorites = this.getFavoriteNames();
        const favoriteRecipes = this.getFavoriteRecipes();
        const isFavorite = favorites.includes(recipeName);

        if (isFavorite) {
            localStorage.setItem('favorites', JSON.stringify(favorites.filter(name => name !== recipeName)));
            delete favoriteRecipes[recipeName];
        } else {
            favorites.push(recipeName);
            if (typeof recipe === 'object') {
                favoriteRecipes[recipeName] = {
                    recipe_name: recipe.recipe_name,
                    image_url: recipe.image_url,
                    url: recipe.url,
                    ingredient_lines: recipe.ingredient_lines
                };
            }
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }

        localStorage.setItem('favoriteRecipes', JSON.stringify(favoriteRecipes));
        return !isFavorite;
    },

    createShoppingItem(ingredient, isChecked) {
        const newDiv = document.createElement('div');
        newDiv.className = 'shoppingitem';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'shoppingcheckbox';
        checkbox.checked = isChecked;
        const label = document.createElement('a');
        label.textContent = ` ${ingredient}`;
        newDiv.append(checkbox, label);
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
            const ingredients = typeof recipe.ingredient_lines === 'string'
                ? JSON.parse(recipe.ingredient_lines)
                : recipe.ingredient_lines;
            return Array.isArray(ingredients) ? ingredients : [];
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

    async translateSearchQuery(query, sourceLanguage) {
        if (sourceLanguage === 'en' || !query.trim()) {
            return query;
        }

        const [translatedQuery] = await window.PantryIQ.language.translateValues(
            [query], sourceLanguage, 'en'
        );
        return translatedQuery;
    },

    async localizeRecipes(recipes) {
        const language = window.PantryIQ.language.current;
        const recipeIngredients = recipes.map(recipe => this.parseIngredientLines(recipe));
        if (language === 'en') {
            return recipes.map((recipe, index) => ({
                ...recipe,
                displayName: recipe.recipe_name,
                displayIngredients: recipeIngredients[index]
            }));
        }

        const sourceTexts = [];
        recipes.forEach((recipe, index) => {
            sourceTexts.push(recipe.recipe_name, ...recipeIngredients[index]);
        });
        const translatedTexts = await window.PantryIQ.language.translateValues(sourceTexts, 'en', language);

        let translationIndex = 0;
        return recipes.map((recipe, index) => {
            const displayName = translatedTexts[translationIndex++];
            const displayIngredients = recipeIngredients[index].map(() => translatedTexts[translationIndex++]);
            return { ...recipe, displayName, displayIngredients };
        });
    },

    async translateShoppingLists(sourceLanguage, targetLanguage) {
        const ingredientLinks = Array.from(document.querySelectorAll('.shoppingitem a'));
        if (ingredientLinks.length === 0) {
            return;
        }

        const translations = await window.PantryIQ.language.translateValues(
            ingredientLinks.map(link => link.textContent.trim()), sourceLanguage, targetLanguage
        );
        ingredientLinks.forEach((link, index) => {
            link.textContent = ` ${translations[index]}`;
        });
    },
};

document.addEventListener('pantry-language-change', event => {
    window.PantryIQ.utils.translateShoppingLists(event.detail.previousLanguage, event.detail.language);
});
