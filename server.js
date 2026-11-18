
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = 3000;

// ПОДКЛЮЧЕНИЕ К POSTGRESQL
const db = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// НАСТРОЙКИ
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'moviehub_secret_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 86400000
    }
}));

app.use(express.static('public'));

// ПРОВЕРКА СЕРВЕРА
app.get('/api/check', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT current_database() AS database'
        );

        res.json({
            status: 'OK',
            database: result.rows[0].database
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// РЕГИСТРАЦИЯ
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                error: 'Заполните все поля'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: 'Пароль должен содержать минимум 8 символов'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existing = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [normalizedEmail]
        );

        if (existing.rows.length) {
            return res.status(409).json({
                error: 'Этот email уже зарегистрирован'
            });
        }

        const hash = await bcrypt.hash(password, 12);

        const result = await db.query(
            `INSERT INTO users (username, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, username, email`,
            [username.trim(), normalizedEmail, hash]
        );

        const user = result.rows[0];

        req.session.userId = user.id;

        res.status(201).json({
            message: 'Регистрация успешна',
            user
        });

    } catch (error) {
        console.error('ОШИБКА РЕГИСТРАЦИИ:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Такой email уже существует'
            });
        }

        res.status(500).json({
            error: 'Ошибка регистрации',
            details: error.message
        });
    }
});

// ВХОД
app.post('/api/login', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        const result = await db.query(
            `SELECT id, username, email, password_hash
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (!result.rows.length) {
            return res.status(401).json({
                error: 'Неверный email или пароль'
            });
        }

        const user = result.rows[0];

        const valid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!valid) {
            return res.status(401).json({
                error: 'Неверный email или пароль'
            });
        }

        req.session.userId = user.id;

        res.json({
            message: 'Вход выполнен',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('ОШИБКА ВХОДА:', error);
        res.status(500).json({ error: error.message });
    }
});

// ПОЛУЧЕНИЕ ПРОФИЛЯ
app.get('/api/me', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                error: 'Вы не авторизованы'
            });
        }

        const result = await db.query(
            `SELECT id, username, email, avatar_url
             FROM users
             WHERE id = $1`,
            [req.session.userId]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                error: 'Пользователь не найден'
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// ИЗМЕНЕНИЕ ПРОФИЛЯ
app.put('/api/profile', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                error: 'Сначала войдите в аккаунт'
            });
        }

        const username = String(req.body.username || '').trim();
        const avatarUrl = String(req.body.avatar_url || '').trim();

        if (username.length < 2 || username.length > 30) {
            return res.status(400).json({
                error: 'Имя должно содержать от 2 до 30 символов'
            });
        }

        if (avatarUrl.length > 1000) {
            return res.status(400).json({
                error: 'Ссылка на аватар слишком длинная'
            });
        }

        let validAvatarUrl = null;

        if (avatarUrl) {
            try {
                const parsedUrl = new URL(avatarUrl);

                if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                    throw new Error('Недопустимый протокол');
                }

                validAvatarUrl = parsedUrl.href;

            } catch {
                return res.status(400).json({
                    error: 'Введите правильную ссылку на изображение'
                });
            }
        }

        const result = await db.query(
            `UPDATE users
             SET username = $1,
                 avatar_url = $2
             WHERE id = $3
             RETURNING id, username, email, avatar_url`,
            [username, validAvatarUrl, req.session.userId]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                error: 'Пользователь не найден'
            });
        }

        res.json({
            message: 'Профиль успешно обновлён',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('ОШИБКА ИЗМЕНЕНИЯ ПРОФИЛЯ:', error);

        res.status(500).json({
            error: 'Не удалось изменить профиль'
        });
    }
});

// ПОЛУЧЕНИЕ ИЗБРАННОГО
app.get('/api/favorites', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                error: 'Сначала войдите в аккаунт'
            });
        }

        const result = await db.query(
            `SELECT movie_id, movie_title, poster_path, created_at
             FROM favorites
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.session.userId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error('Ошибка получения избранного:', error);

        res.status(500).json({
            error: 'Не удалось получить избранное'
        });
    }
});

// ДОБАВЛЕНИЕ В ИЗБРАННОЕ
app.post('/api/favorites', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                error: 'Сначала войдите в аккаунт'
            });
        }

        const movieId = Number(req.body.movie_id);
        const movieTitle = String(req.body.movie_title || '').trim();
        const posterPath = req.body.poster_path
            ? String(req.body.poster_path)
            : null;

        if (
            !Number.isSafeInteger(movieId) ||
            movieId <= 0 ||
            !movieTitle ||
            movieTitle.length > 255
        ) {
            return res.status(400).json({
                error: 'Некорректные данные фильма'
            });
        }

        if (posterPath && posterPath.length > 255) {
            return res.status(400).json({
                error: 'Некорректный путь постера'
            });
        }

        await db.query(
            `INSERT INTO favorites
             (user_id, movie_id, movie_title, poster_path)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, movie_id) DO NOTHING`,
            [
                req.session.userId,
                movieId,
                movieTitle,
                posterPath
            ]
        );

        res.json({
            message: 'Фильм добавлен в избранное'
        });

    } catch (error) {
        console.error('Ошибка добавления избранного:', error);

        res.status(500).json({
            error: 'Не удалось добавить фильм'
        });
    }
});

// УДАЛЕНИЕ ИЗ ИЗБРАННОГО
app.delete('/api/favorites/:movieId', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({
                error: 'Сначала войдите в аккаунт'
            });
        }

        const movieId = Number(req.params.movieId);

        if (!Number.isSafeInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                error: 'Некорректный ID фильма'
            });
        }

        await db.query(
            `DELETE FROM favorites
             WHERE user_id = $1 AND movie_id = $2`,
            [req.session.userId, movieId]
        );

        res.json({
            message: 'Фильм удалён из избранного'
        });

    } catch (error) {
        console.error('Ошибка удаления избранного:', error);

        res.status(500).json({
            error: 'Не удалось удалить фильм'
        });
    }
});

// ВЫХОД
app.post('/api/logout', (req, res) => {
    req.session.destroy(error => {
        if (error) {
            return res.status(500).json({
                error: 'Ошибка выхода'
            });
        }

        res.clearCookie('connect.sid');

        res.json({
            message: 'Вы вышли из аккаунта'
        });
    });
});

// ЗАПУСК СЕРВЕРА
async function startServer() {
    try {
        const result = await db.query(`
            SELECT
                current_database() AS database,
                to_regclass('public.users') AS users_table,
                to_regclass('public.favorites') AS favorites_table
        `);

        console.log('База данных:', result.rows[0].database);
        console.log('Таблица users:', result.rows[0].users_table);
        console.log('Таблица favorites:', result.rows[0].favorites_table);

        if (!result.rows[0].users_table) {
            throw new Error('Таблица users не найдена');
        }

        if (!result.rows[0].favorites_table) {
            throw new Error('Таблица favorites не найдена');
        }

        app.listen(PORT, () => {
            console.log('MovieHub запущен!');
            console.log(`http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Ошибка запуска:', error);
        process.exit(1);
    }
}
// ===============================
// ОТЗЫВЫ И ОЦЕНКИ ФИЛЬМОВ
// ===============================

// Получение отзывов фильма
app.get('/api/reviews/:movieId', async (req, res) => {
    try {
        const movieId = Number(req.params.movieId);

        if (!Number.isInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                error: 'Неверный ID фильма'
            });
        }

        const result = await db.query(`
            SELECT
                reviews.id,
                reviews.user_id,
                reviews.movie_id,
                reviews.rating,
                reviews.comment,
                reviews.created_at,
                reviews.updated_at,
                users.username,
                users.avatar_url
            FROM reviews
            JOIN users ON users.id = reviews.user_id
            WHERE reviews.movie_id = $1
            ORDER BY reviews.created_at DESC
        `, [movieId]);

        res.json(result.rows);

    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
        res.status(500).json({
            error: 'Не удалось загрузить отзывы'
        });
    }
});


// Добавление или изменение отзыва
app.post('/api/reviews', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'Сначала войдите в аккаунт'
        });
    }

    try {
        const { movie_id, rating, comment } = req.body;

        const movieId = Number(movie_id);
        const movieRating = Number(rating);
        const movieComment = String(comment || '').trim();

        if (!Number.isInteger(movieId) || movieId <= 0) {
            return res.status(400).json({
                error: 'Неверный ID фильма'
            });
        }

        if (!Number.isInteger(movieRating) ||
            movieRating < 1 || movieRating > 10) {
            return res.status(400).json({
                error: 'Оценка должна быть от 1 до 10'
            });
        }

        if (!movieComment || movieComment.length > 2000) {
            return res.status(400).json({
                error: 'Комментарий должен содержать от 1 до 2000 символов'
            });
        }

        const result = await db.query(`
            INSERT INTO reviews (user_id, movie_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, movie_id)
            DO UPDATE SET
                rating = EXCLUDED.rating,
                comment = EXCLUDED.comment,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            req.session.userId,
            movieId,
            movieRating,
            movieComment
        ]);

        res.json({
            message: 'Отзыв сохранён!',
            review: result.rows[0]
        });

    } catch (error) {
        console.error('Ошибка сохранения отзыва:', error);
        res.status(500).json({
            error: 'Не удалось сохранить отзыв'
        });
    }
});


// Удаление своего отзыва
app.delete('/api/reviews/:id', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            error: 'Сначала войдите в аккаунт'
        });
    }

    try {
        const reviewId = Number(req.params.id);

        if (!Number.isInteger(reviewId) || reviewId <= 0) {
            return res.status(400).json({
                error: 'Неверный ID отзыва'
            });
        }

        const result = await db.query(`
            DELETE FROM reviews
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [reviewId, req.session.userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: 'Отзыв не найден'
            });
        }

        res.json({
            message: 'Отзыв удалён!'
        });

    } catch (error) {
        console.error('Ошибка удаления отзыва:', error);
        res.status(500).json({
            error: 'Не удалось удалить отзыв'
        });
    }
});
startServer();
