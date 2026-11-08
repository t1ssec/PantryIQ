let favorites = JSON.parse(localStorage.getItem('favorites')) || []; // вземи всички любими от localStorage или създай празен масив, ако няма такива

let buttons = document.querySelectorAll('.recipeFavorite');

buttons.forEach(button => {
    button.addEventListener('click', function () {
        let foodName = button.dataset.foodName; // вземи уникалния идентификатор на храната от атрибута data-food-name на бутона

        if (!favorites.includes(foodName)) {
            favorites.push(foodName); // добави нов елемент към масива с любими
        }
        else {
            favorites = favorites.filter(item => item !== foodName) // премахва елемента ако вече съществува
        }
        localStorage.setItem('favorites', JSON.stringify(favorites)); // запази актуализирания масив с любими обратно в localStorage
    });
});