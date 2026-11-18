
const API_KEY = "d2ba388232dbec7170c572dc2ca57a6d";

const moviesContainer = document.querySelector(".movies-grid");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

const IMAGE_URL = "https://image.tmdb.org/t/p/w500";

let selectedGenre = null;
let favoriteMovieIds = new Set();
let favoritesLoaded = false;

// СОЗДАНИЕ БЛОКА ЖАНРОВ
const genreFilters = document.createElement("div");
genreFilters.id = "genreFilters";
genreFilters.className = "genre-filters";

if (moviesContainer) {
    moviesContainer.parentNode.insertBefore(
        genreFilters,
        moviesContainer
    );
}

// ЗАГРУЗКА ИЗБРАННОГО
async function loadFavoriteIds() {
    try {
        const response = await fetch("/api/favorites");

        if (response.status === 401) {
            favoriteMovieIds.clear();
            favoritesLoaded = true;
            return;
        }

        if (!response.ok) {
            throw new Error("Не удалось загрузить избранное");
        }

        const favorites = await response.json();

        favoriteMovieIds = new Set(
            favorites.map(movie => Number(movie.movie_id))
        );

        favoritesLoaded = true;

    } catch (error) {
        console.error("Ошибка загрузки избранного:", error);
    }
}

// ДОБАВЛЕНИЕ И УДАЛЕНИЕ ИЗБРАННОГО
async function toggleFavorite(movie, button) {
    try {
        const isFavorite = favoriteMovieIds.has(Number(movie.id));

        const response = await fetch(
            isFavorite
                ? `/api/favorites/${movie.id}`
                : "/api/favorites",
            {
                method: isFavorite ? "DELETE" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: isFavorite
                    ? undefined
                    : JSON.stringify({
                        movie_id: movie.id,
                        movie_title: movie.title || movie.name || "Без названия",
                        poster_path: movie.poster_path || null
                    })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                alert("Чтобы добавлять фильмы в избранное, войдите в аккаунт.");
                return;
            }

            throw new Error(data.error || "Ошибка избранного");
        }

        if (isFavorite) {
            favoriteMovieIds.delete(Number(movie.id));
            button.textContent = "♡";
            button.title = "Добавить в избранное";
        } else {
            favoriteMovieIds.add(Number(movie.id));
            button.textContent = "❤️";
            button.title = "Удалить из избранного";
        }

    } catch (error) {
        console.error(error);
        alert(error.message || "Не удалось изменить избранное");
    }
}

// ЗАГРУЗКА ФИЛЬМОВ
async function loadMovies(url) {
    if (!moviesContainer) return;

    try {
        moviesContainer.innerHTML = "<p>Загрузка фильмов...</p>";

        console.log("Отправляем запрос:", url);

        const response = await fetch(url);

        console.log("Статус ответа TMDB:", response.status);

        const data = await response.json();

        console.log("Ответ TMDB:", data);

        if (!response.ok) {
            throw new Error(data.status_message || "Ошибка загрузки фильмов");
        }

        if (!favoritesLoaded) {
            await loadFavoriteIds();
        }

        displayMovies(data.results || []);

    } catch (error) {
        console.error("Ошибка загрузки:", error);

        moviesContainer.innerHTML =
            `<p>Ошибка: ${error.message}</p>`;
    }
}

// ОТОБРАЖЕНИЕ ФИЛЬМОВ
function displayMovies(movies) {
    if (!moviesContainer) return;

    moviesContainer.innerHTML = "";

    if (movies.length === 0) {
        moviesContainer.innerHTML = "<p>Фильмы не найдены.</p>";
        return;
    }

    movies.forEach(movie => {
        const card = document.createElement("div");
        card.className = "movie-card";

        // КНОПКА ИЗБРАННОГО
        const favoriteButton = document.createElement("button");

        favoriteButton.className = "favorite-button";
        favoriteButton.textContent =
            favoriteMovieIds.has(Number(movie.id)) ? "❤️" : "♡";

        favoriteButton.title = "Добавить в избранное";

        favoriteButton.addEventListener("click", async event => {
            event.stopPropagation();
            await toggleFavorite(movie, favoriteButton);
        });

        // ОТКРЫТИЕ СТРАНИЦЫ ФИЛЬМА
        card.style.cursor = "pointer";

        card.addEventListener("click", () => {
            window.location.href = `movie.html?id=${movie.id}`;
        });

        const poster = movie.poster_path
            ? IMAGE_URL + movie.poster_path
            : "https://placehold.co/500x750/151520/ffffff?text=No+Poster";

        card.innerHTML = `
            <img src="${poster}" alt="Постер фильма">
            <div class="movie-info">
                <h3></h3>
                <p>${movie.release_date || "Дата неизвестна"}</p>
                <p class="movie-rating">
                    ★ ${Number(movie.vote_average || 0).toFixed(1)} / 10
                </p>
            </div>
        `;

        card.querySelector("h3").textContent =
            movie.title || movie.name || "Без названия";

        card.appendChild(favoriteButton);
        moviesContainer.appendChild(card);
    });
}

// ПОПУЛЯРНЫЕ ФИЛЬМЫ
function loadPopularMovies() {
    selectedGenre = null;
    updateGenreButtons();

    const url =
        `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=ru-RU&page=1`;

    loadMovies(url);
}

// ЗАГРУЗКА ЖАНРОВ ИЗ TMDB
async function loadGenres() {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=ru-RU`
        );

        if (!response.ok) {
            throw new Error("Не удалось загрузить жанры");
        }

        const data = await response.json();

        genreFilters.innerHTML = "";

        createGenreButton("Все фильмы", null);

        data.genres.forEach(genre => {
            createGenreButton(genre.name, genre.id);
        });

        updateGenreButtons();

    } catch (error) {
        console.error("Ошибка загрузки жанров:", error);
        genreFilters.innerHTML = "<p>Не удалось загрузить жанры</p>";
    }
}

// СОЗДАНИЕ КНОПКИ ЖАНРА
function createGenreButton(name, genreId) {
    const button = document.createElement("button");

    button.className = "genre-button";
    button.textContent = name;

    button.dataset.genreId =
        genreId === null ? "all" : String(genreId);

    button.addEventListener("click", () => {
        if (searchInput) {
            searchInput.value = "";
        }

        selectedGenre = genreId;
        updateGenreButtons();

        if (genreId === null) {
            loadPopularMovies();
        } else {
            loadMovies(
                `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=ru-RU&with_genres=${genreId}&sort_by=popularity.desc&page=1`
            );
        }
    });

    genreFilters.appendChild(button);
}

// ОБНОВЛЕНИЕ ВЫБРАННОЙ КНОПКИ
function updateGenreButtons() {
    const buttons = genreFilters.querySelectorAll(".genre-button");

    buttons.forEach(button => {
        const isActive = button.dataset.genreId ===
            (selectedGenre === null ? "all" : String(selectedGenre));

        button.classList.toggle("active", isActive);
    });
}

// ПОИСК ФИЛЬМОВ
function searchMovies() {
    console.log("ПОИСК НАЖАТ!");
    if (!searchInput) return;

    const query = searchInput.value.trim();

    if (!query) {
        loadPopularMovies();
        return;
    }

    selectedGenre = null;
    updateGenreButtons();

    const url =
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=ru-RU&query=${encodeURIComponent(query)}`;

    loadMovies(url);
}

// ОБРАБОТЧИКИ ПОИСКА
if (searchButton && searchInput) {
    searchButton.addEventListener("click", searchMovies);

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            searchMovies();
        }
    });
}

// ПРОВЕРКА АВТОРИЗАЦИИ
async function checkAuth() {
    const authButtons = document.getElementById("authButtons");

    if (!authButtons) return;

    try {
        const response = await fetch("/api/me");
        const data = await response.json();

        if (response.ok && data.id) {
            authButtons.innerHTML = "";

            const accountLink = document.createElement("a");
            accountLink.href = "account.html";
            accountLink.className = "profile-link";

            const avatar = document.createElement("img");
            avatar.className = "header-avatar";
            avatar.src = data.avatar_url ||
                "https://placehold.co/100x100/29203a/ffffff?text=USER";

            avatar.alt = "Мой профиль";

            avatar.onerror = () => {
                avatar.src =
                    "https://placehold.co/100x100/29203a/ffffff?text=USER";
            };

            accountLink.appendChild(avatar);
            authButtons.appendChild(accountLink);
        }

    } catch (error) {
        console.error("Ошибка проверки аккаунта:", error);
    }
}

// ЗАПУСК
loadGenres();
loadPopularMovies();
checkAuth();
