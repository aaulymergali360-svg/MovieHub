
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";

const favoritesContainer = document.getElementById("favoritesContainer");

// ЗАГРУЗКА ИЗБРАННОГО
async function loadFavorites() {
    try {
        const response = await fetch("/api/favorites");

        if (response.status === 401) {
            favoritesContainer.innerHTML = `
                <p>Сначала войди в аккаунт, чтобы посмотреть избранное.</p>
                <a href="login.html">Войти</a>
            `;
            return;
        }

        if (!response.ok) {
            throw new Error("Не удалось загрузить избранное");
        }

        const favorites = await response.json();

        displayFavorites(favorites);

    } catch (error) {
        console.error(error);

        favoritesContainer.innerHTML =
            "<p>Ошибка загрузки избранного.</p>";
    }
}

// ОТОБРАЖЕНИЕ ФИЛЬМОВ
function displayFavorites(favorites) {
    favoritesContainer.innerHTML = "";

    if (favorites.length === 0) {
        favoritesContainer.innerHTML = `
            <div class="empty-favorites">
                <h2>Пока здесь пусто 💔</h2>
                <p>Добавляй понравившиеся фильмы с помощью сердечка.</p>
                <a href="index.html">Перейти к фильмам</a>
            </div>
        `;
        return;
    }

    favorites.forEach(movie => {
        const card = document.createElement("div");
        card.className = "movie-card";

        const poster = movie.poster_path
            ? IMAGE_URL + movie.poster_path
            : "https://placehold.co/500x750/151520/ffffff?text=No+Poster";

        const image = document.createElement("img");
        image.src = poster;
        image.alt = "Постер фильма";

        const info = document.createElement("div");
        info.className = "movie-info";

        const title = document.createElement("h3");
        title.textContent = movie.movie_title;

        const removeButton = document.createElement("button");
        removeButton.className = "remove-favorite";
        removeButton.textContent = "❤️ Удалить";

        removeButton.addEventListener("click", () => {
            removeFavorite(movie.movie_id);
        });

        card.style.cursor = "pointer";

        card.addEventListener("click", () => {
            window.location.href = `movie.html?id=${movie.movie_id}`;
        });

        removeButton.addEventListener("click", event => {
            event.stopPropagation();
        });

        info.appendChild(title);
        info.appendChild(removeButton);

        card.appendChild(image);
        card.appendChild(info);

        favoritesContainer.appendChild(card);
    });
}

// УДАЛЕНИЕ ИЗ ИЗБРАННОГО
async function removeFavorite(movieId) {
    try {
        const response = await fetch(`/api/favorites/${movieId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Не удалось удалить фильм");
        }

        loadFavorites();

    } catch (error) {
        console.error(error);
        alert("Ошибка удаления фильма");
    }
}

// ЗАПУСК
loadFavorites();
