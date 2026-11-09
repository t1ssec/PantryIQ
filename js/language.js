window.PantryIQ = window.PantryIQ || {};

const languageStrings = {
    en: {
        navigationLabel: 'Main navigation',
        ingredientsLink: 'By Ingredients',
        searchLink: 'Search Recipes',
        favoritesLink: 'Favorites',
        languageLabel: 'Language',
        themeLabel: 'Color theme',
        lightTheme: 'Light',
        darkTheme: 'Dark',
        homeTitle: 'Welcome to PantryIQ',
        homeDescription: 'Search for recipes and find what to cook based on the ingredients you already have.',
        startUsing: 'Start using',
        viewGithub: 'View on Github',
        searchLabel: 'Search',
        ingredientPlaceholder: 'Enter ingredients:',
        recipePlaceholder: 'Type a recipe name:',
        foundRecipes: 'Found Recipes',
        ingredientsHave: 'Ingredients you have',
        ingredientsMissing: 'Missing ingredients',
        searchPrompt: 'Try searching for something',
        choosePrompt: 'Try choosing a recipe first.',
        noRecipes: 'No recipes found',
        tryRecipeSearch: 'Try searching for a different recipe name.',
        tryIngredientSearch: 'Try searching for different ingredients.',
        viewRecipe: 'View Recipe',
        chooseRecipe: 'Choose',
        addFavorite: 'Add to favorites',
        removeFavorite: 'Remove from favorites',
        favoritesTitle: 'Favorited Recipes',
        noFavorites: 'You have not added any favorite recipes yet.',
        favoritesLoadError: 'Could not load your saved recipes. Try refreshing the page.',
        searchPageTitle: 'Search Recipes',
        ingredientsPageTitle: 'By Ingredients',
        favoritesPlaceholder: 'Add functionality',
        previousPage: 'Previous',
        nextPage: 'Next',
        pageLabel: 'Page',
        pageOf: 'of',
        recipePageTitle: 'Recipe',
        backToRecipes: 'Back to recipes',
        recipeLoading: 'Loading recipe...',
        recipeNotFound: 'Recipe not found.',
        recipeLoadError: 'Could not load this recipe. Please try again.',
        ingredientsHeading: 'Ingredients',
        servingsLabel: 'Servings',
        caloriesLabel: 'Calories',
        originalSource: 'Original Source',
        madeWith: 'Made with'
    },
    bg: {
        navigationLabel: 'Основна навигация',
        ingredientsLink: 'По съставки',
        searchLink: 'Търсене на рецепти',
        favoritesLink: 'Любими',
        languageLabel: 'Език',
        themeLabel: 'Цветова тема',
        lightTheme: 'Светла',
        darkTheme: 'Тъмна',
        homeTitle: 'Добре дошли в PantryIQ',
        homeDescription: 'Търсете рецепти и открийте какво да сготвите със съставките, които вече имате.',
        startUsing: 'Започни',
        viewGithub: 'Виж в GitHub',
        searchLabel: 'Търсене',
        ingredientPlaceholder: 'Въведете съставки:',
        recipePlaceholder: 'Въведете име на рецепта:',
        foundRecipes: 'Намерени рецепти',
        ingredientsHave: 'Налични съставки',
        ingredientsMissing: 'Липсващи съставки',
        searchPrompt: 'Опитайте да потърсите нещо',
        choosePrompt: 'Първо изберете рецепта.',
        noRecipes: 'Няма намерени рецепти',
        tryRecipeSearch: 'Опитайте с друго име на рецепта.',
        tryIngredientSearch: 'Опитайте с други съставки.',
        viewRecipe: 'Виж рецептата',
        chooseRecipe: 'Избери',
        addFavorite: 'Добави в любими',
        removeFavorite: 'Премахни от любими',
        favoritesTitle: 'Любими рецепти',
        noFavorites: 'Все още нямате добавени любими рецепти.',
        favoritesLoadError: 'Запазените рецепти не се заредиха. Опитайте да презаредите страницата.',
        searchPageTitle: 'Търсене на рецепти',
        ingredientsPageTitle: 'По съставки',
        favoritesPlaceholder: 'Добавете функционалност',
        previousPage: 'Назад',
        nextPage: 'Напред',
        pageLabel: 'Страница',
        pageOf: 'от',
        recipePageTitle: 'Рецепта',
        backToRecipes: 'Назад към рецептите',
        recipeLoading: 'Рецептата се зарежда...',
        recipeNotFound: 'Рецептата не е намерена.',
        recipeLoadError: 'Рецептата не се зареди. Опитайте отново.',
        ingredientsHeading: 'Съставки',
        servingsLabel: 'Порции',
        caloriesLabel: 'Калории',
        originalSource: 'Оригинален източник',
        madeWith: 'Приготвя се с'
    }
};

const savedLanguage = localStorage.getItem('pantryiq-language');
let currentLanguage = savedLanguage === 'bg' ? 'bg' : 'en';
const languageButtons = document.querySelectorAll('.language-btn');
const languageSwitcher = document.querySelector('.language-switcher');

function translateValues(values, sourceLanguage, targetLanguage) {
    if (sourceLanguage === targetLanguage || values.length === 0) {
        return Promise.resolve(values);
    }

    return fetch('/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            texts: values,
            source_language: sourceLanguage,
            target_language: targetLanguage
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Translation request failed');
            }
            return response.json();
        })
        .then(data => data.translations || values)
        .catch(() => values);
}

function updateDocumentLanguage() {
    const strings = languageStrings[currentLanguage];
    document.documentElement.lang = currentLanguage;
    if (languageSwitcher) {
        languageSwitcher.dataset.selectedLanguage = currentLanguage;
    }

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const value = strings[element.dataset.i18n];
        if (value) {
            element.textContent = value;
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const value = strings[element.dataset.i18nPlaceholder];
        if (value) {
            element.placeholder = value;
        }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
        const value = strings[element.dataset.i18nAria];
        if (value) {
            element.setAttribute('aria-label', value);
        }
    });

    languageButtons.forEach(button => {
        const isActive = button.dataset.language === currentLanguage;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });

    const title = document.querySelector('title');
    if (title) {
        const pageTitle = document.body.dataset.pageTitle;
        title.textContent = `${pageTitle ? strings[pageTitle] : 'PantryIQ'} - PantryIQ`;
    }
}

function setLanguage(language) {
    const previousLanguage = currentLanguage;
    currentLanguage = language === 'bg' ? 'bg' : 'en';
    localStorage.setItem('pantryiq-language', currentLanguage);
    updateDocumentLanguage();
    document.dispatchEvent(new CustomEvent('pantry-language-change', {
        detail: { language: currentLanguage, previousLanguage }
    }));
}

languageButtons.forEach(button => {
    button.addEventListener('click', () => setLanguage(button.dataset.language));
});

window.PantryIQ.language = {
    get current() {
        return currentLanguage;
    },
    get opposite() {
        return currentLanguage === 'bg' ? 'en' : 'bg';
    },
    text(key) {
        return languageStrings[currentLanguage][key] || key;
    },
    translateValues(values, sourceLanguage, targetLanguage) {
        return translateValues(values, sourceLanguage, targetLanguage);
    }
};

updateDocumentLanguage();
