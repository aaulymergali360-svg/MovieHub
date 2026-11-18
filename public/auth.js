
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");

// РЕГИСТРАЦИЯ
if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = document.getElementById("message");

        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        message.textContent = "Регистрация...";

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Ошибка регистрации");
            }

            message.style.color = "#4ade80";
            message.textContent = "Регистрация успешна!";

            registerForm.reset();

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);

        } catch (error) {
            message.style.color = "#f87171";
            message.textContent = error.message;
        }
    });
}

// ВХОД
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = document.getElementById("message");

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        message.textContent = "Выполняется вход...";

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Ошибка входа");
            }

            message.style.color = "#4ade80";
            message.textContent = "Вы успешно вошли!";

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);

        } catch (error) {
            message.style.color = "#f87171";
            message.textContent = error.message;
        }
    });
}
