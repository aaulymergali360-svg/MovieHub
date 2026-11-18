
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const avatarInput = document.getElementById("avatarUrl");
const avatarPreview = document.getElementById("avatarPreview");

const profileForm = document.getElementById("profileForm");
const logoutButton = document.getElementById("logoutButton");
const message = document.getElementById("message");

const defaultAvatar =
    "https://placehold.co/150x150/29203a/ffffff?text=USER";

// ЗАГРУЗКА ПРОФИЛЯ
async function loadProfile() {
    try {
        const response = await fetch("/api/me");
        const data = await response.json();

        if (!response.ok || !data.id) {
            window.location.href = "login.html";
            return;
        }

        usernameInput.value = data.username;
        emailInput.value = data.email;
        avatarInput.value = data.avatar_url || "";

        avatarPreview.src = data.avatar_url || defaultAvatar;

    } catch (error) {
        console.error(error);
        message.textContent = "Ошибка загрузки профиля";
    }
}

// ПРЕДПРОСМОТР АВАТАРА
avatarInput.addEventListener("input", () => {
    const url = avatarInput.value.trim();

    avatarPreview.src = url || defaultAvatar;
});

avatarPreview.addEventListener("error", () => {
    avatarPreview.src = defaultAvatar;
});

// СОХРАНЕНИЕ ПРОФИЛЯ
profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.style.color = "#c084fc";
    message.textContent = "Сохранение...";

    try {
        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: usernameInput.value.trim(),
                avatar_url: avatarInput.value.trim()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Ошибка сохранения");
        }

        usernameInput.value = data.user.username;
        avatarInput.value = data.user.avatar_url || "";

        avatarPreview.src = data.user.avatar_url || defaultAvatar;

        message.style.color = "#4ade80";
        message.textContent = "Профиль успешно обновлён!";

    } catch (error) {
        message.style.color = "#f87171";
        message.textContent = error.message;
    }
});

// ВЫХОД
logoutButton.addEventListener("click", async () => {
    try {
        const response = await fetch("/api/logout", {
            method: "POST"
        });

        if (response.ok) {
            window.location.href = "index.html";
        } else {
            message.textContent = "Ошибка выхода";
        }

    } catch (error) {
        message.textContent = "Ошибка соединения";
    }
});

loadProfile();
