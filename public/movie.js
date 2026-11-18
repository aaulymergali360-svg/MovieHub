
const API_KEY = "d2ba388232dbec7170c572dc2ca57a6d";

const IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_URL = "https://image.tmdb.org/t/p/original";

const movieDetails = document.getElementById("movieDetails");

const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");

// =====================================
// ЗАГРУЗКА ИНФОРМАЦИИ О ФИЛЬМЕ
// =====================================

async function loadMovieDetails() {
    if (!movieId) {
        movieDetails.innerHTML = "<h2>Фильм не найден</h2>";
        return;
    }

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=ru-RU`
        );

        if (!response.ok) {
            throw new Error("Не удалось загрузить фильм");
        }

        const movie = await response.json();

        const videoResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${API_KEY}&language=ru-RU`
        );

        const videoData = await videoResponse.json();

        let trailer = videoData.results?.find(video =>
            video.site === "YouTube" &&
            video.type === "Trailer" &&
            video.official
        );

        if (!trailer) {
            trailer = videoData.results?.find(video =>
                video.site === "YouTube" &&
                video.type === "Trailer"
            );
        }

        const genres = movie.genres
            .map(genre => genre.name)
            .join(", ");

        const poster = movie.poster_path
            ? IMAGE_URL + movie.poster_path
            : "https://placehold.co/500x750/151520/ffffff?text=No+Poster";

        const backdrop = movie.backdrop_path
            ? BACKDROP_URL + movie.backdrop_path
            : "";

        movieDetails.innerHTML = `
            <div class="movie-backdrop"
                style="background-image: url('${backdrop}')">
            </div>

            <div class="movie-content">
                <img class="movie-poster"
                    src="${poster}"
                    alt="Постер фильма">

                <div class="movie-description">
                    <h1>${escapeHTML(movie.title || "Без названия")}</h1>

                    <p class="movie-rating">
                        ★ ${Number(movie.vote_average || 0).toFixed(1)} / 10
                    </p>

                    <p><strong>Дата выхода:</strong>
                        ${movie.release_date || "Неизвестно"}
                    </p>

                    <p><strong>Жанры:</strong>
                        ${escapeHTML(genres || "Не указаны")}
                    </p>

                    <p><strong>Продолжительность:</strong>
                        ${movie.runtime ? movie.runtime + " мин." : "Неизвестно"}
                    </p>

                    <h2>Описание</h2>

                    <p class="overview">
                        ${escapeHTML(movie.overview || "Описание отсутствует.")}
                    </p>

                    ${
                        trailer
                        ? `
                            <h2>Трейлер</h2>
                            <div class="trailer-container">
                                <iframe
                                    src="https://www.youtube.com/embed/${encodeURIComponent(trailer.key)}"
                                    title="Трейлер фильма"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        `
                        : "<p>Трейлер пока недоступен.</p>"
                    }

                    <a href="index.html" class="back-button">
                        ← Вернуться к фильмам
                    </a>
                </div>
            </div>
        `;

        document.title = movie.title + " — MovieHub";

    } catch (error) {
        console.error("Ошибка загрузки фильма:", error);

        movieDetails.innerHTML =
            "<h2>Ошибка загрузки фильма. Попробуйте позже.</h2>";
    }
}

// =====================================
// ЗАЩИТА HTML
// =====================================

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// =====================================
// СИСТЕМА ОТЗЫВОВ И ОЦЕНОК
// =====================================

const reviewsList = document.getElementById("reviewsList");
const reviewRating = document.getElementById("reviewRating");
const reviewComment = document.getElementById("reviewComment");
const submitReview = document.getElementById("submitReview");
const reviewMessage = document.getElementById("reviewMessage");

let currentReviewUser = null;

// =====================================
// ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
// =====================================

async function getReviewUser() {
    try {
        const response = await fetch("/api/me");

        if (!response.ok) {
            currentReviewUser = null;
            return;
        }

        const data = await response.json();

        currentReviewUser = data.id ? data : null;

        console.log("Текущий пользователь:", currentReviewUser);

    } catch (error) {
        console.error("Ошибка получения пользователя:", error);
        currentReviewUser = null;
    }
}

// =====================================
// ЗАГРУЗКА ОТЗЫВОВ
// =====================================

async function loadReviews() {
    if (!reviewsList || !movieId) return;

    try {
        reviewsList.innerHTML = "<p>Загрузка отзывов...</p>";

        const response = await fetch(`/api/reviews/${movieId}`);

        console.log("Статус загрузки отзывов:", response.status);

        if (!response.ok) {
            throw new Error("Не удалось загрузить отзывы");
        }

        const reviews = await response.json();

        reviewsList.innerHTML = "";

        if (!Array.isArray(reviews) || reviews.length === 0) {
            reviewsList.innerHTML =
                "<p>Пока отзывов нет. Будь первым! 💜</p>";
            return;
        }

        reviews.forEach(review => {
            const card = document.createElement("div");
            card.className = "review-card";

            const user = document.createElement("div");
            user.className = "review-user";

            const avatar = document.createElement("img");
            avatar.className = "review-avatar";

            avatar.src = review.avatar_url ||
                "https://placehold.co/100x100/29203a/ffffff?text=USER";

            avatar.alt = "Аватар пользователя";

            avatar.onerror = () => {
                avatar.src =
                    "https://placehold.co/100x100/29203a/ffffff?text=USER";
            };

            const username = document.createElement("strong");
            username.textContent = review.username || "Пользователь";

            user.appendChild(avatar);
            user.appendChild(username);

            const rating = document.createElement("div");
            rating.className = "review-rating";
            rating.textContent = `⭐ ${review.rating} / 10`;

            const comment = document.createElement("p");
            comment.className = "review-comment";
            comment.textContent = review.comment;

            card.appendChild(user);
            card.appendChild(rating);
            card.appendChild(comment);

            if (
                currentReviewUser &&
                Number(currentReviewUser.id) === Number(review.user_id)
            ) {
                const deleteButton = document.createElement("button");

                deleteButton.className = "delete-review";
                deleteButton.textContent = "🗑️ Удалить отзыв";

                deleteButton.addEventListener("click", () => {
                    deleteReview(review.id);
                });

                card.appendChild(deleteButton);
            }

            reviewsList.appendChild(card);
        });

    } catch (error) {
        console.error("Ошибка загрузки отзывов:", error);

        reviewsList.innerHTML =
            "<p>Не удалось загрузить отзывы.</p>";
    }
}

// =====================================
// ПУБЛИКАЦИЯ ОТЗЫВА
// =====================================

async function sendReview() {
    console.log("Нажата кнопка публикации");

    if (!currentReviewUser) {
        reviewMessage.textContent =
            "Сначала войди в аккаунт, чтобы оставить отзыв.";

        console.log("Пользователь не авторизован");
        return;
    }

    const rating = Number(reviewRating.value);
    const comment = reviewComment.value.trim();

    if (!comment) {
        reviewMessage.textContent =
            "Напиши комментарий перед публикацией.";
        return;
    }

    if (rating < 1 || rating > 10) {
        reviewMessage.textContent = "Выбери оценку от 1 до 10.";
        return;
    }

    submitReview.disabled = true;
    reviewMessage.textContent = "Сохранение...";

    try {
        console.log("Отправляем отзыв:", {
            movie_id: movieId,
            rating,
            comment
        });

        const response = await fetch("/api/reviews", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                movie_id: movieId,
                rating: rating,
                comment: comment
            })
        });

        console.log("Статус ответа сервера:", response.status);

        const data = await response.json();

        console.log("Ответ сервера:", data);

        if (!response.ok) {
            throw new Error(data.error || "Ошибка сохранения");
        }

        reviewMessage.textContent =
            "Отзыв успешно опубликован! ❤️";

        reviewComment.value = "";

        await loadReviews();

    } catch (error) {
        console.error("ОШИБКА ПУБЛИКАЦИИ:", error);

        reviewMessage.textContent = error.message;

    } finally {
        submitReview.disabled = false;
    }
}

// =====================================
// УДАЛЕНИЕ ОТЗЫВА
// =====================================

async function deleteReview(reviewId) {
    if (!confirm("Ты действительно хочешь удалить отзыв?")) {
        return;
    }

    try {
        const response = await fetch(`/api/reviews/${reviewId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Ошибка удаления");
        }

        await loadReviews();

    } catch (error) {
        console.error("Ошибка удаления:", error);
        alert(error.message);
    }
}

// =====================================
// ЗАПУСК
// =====================================

async function initReviews() {
    if (!reviewsList) return;

    if (!movieId) {
        reviewsList.innerHTML = "<p>Фильм не найден.</p>";
        return;
    }

    await getReviewUser();
    await loadReviews();
}

if (submitReview) {
    submitReview.addEventListener("click", sendReview);
}

loadMovieDetails();
initReviews();
