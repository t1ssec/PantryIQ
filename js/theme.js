const themeStylesheet = document.getElementById('theme-stylesheet');
const themeButtons = document.querySelectorAll('.theme-btn');
const savedTheme = localStorage.getItem('pantryiq-theme');

function applyTheme(theme, save = false) {
    const selectedTheme = theme === 'light' ? 'light' : 'dark';

    themeStylesheet.href = `/css/${selectedTheme === 'light' ? 'white' : 'dark'}-theme.css`;
    document.documentElement.dataset.theme = selectedTheme;

    themeButtons.forEach(button => {
        const isActive = button.dataset.theme === selectedTheme;
        button.classList.toggle('active', isActive);

        if (isActive) {
            button.setAttribute('aria-current', 'true');
        } else {
            button.removeAttribute('aria-current');
        }
    });

    if (save) {
        localStorage.setItem('pantryiq-theme', selectedTheme);
    }
}

themeButtons.forEach(button => {
    button.addEventListener('click', () => applyTheme(button.dataset.theme, true));
});

applyTheme(savedTheme);
