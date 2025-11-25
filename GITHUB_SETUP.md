# 🐙 Как запушить проект в GitHub

## Проблема

У вас:
- ✅ Git инициализирован
- ✅ Файлы добавлены (`git add`)
- ❌ **Не настроены:**
  - Git user.name и user.email
  - Remote репозиторий GitHub

## Решение (4 шага)

### Шаг 1: Настройте Git пользователя

```bash
cd /Users/xtimor/Documents/PGVectorStore

# Укажите ваше имя и email (используется в коммитах)
git config user.name "Ваше Имя"
git config user.email "ваш@email.com"
```

**Пример:**
```bash
git config user.name "John Doe"
git config user.email "john@example.com"
```

### Шаг 2: Создайте репозиторий на GitHub

1. Откройте https://github.com/new
2. Введите название: `n8n-nodes-postgres-vector-store-tool`
3. Описание: `Extended n8n PGVector Store with RLS and Custom SQL`
4. **НЕ** создавайте README, .gitignore или LICENSE (они уже есть)
5. Нажмите **Create repository**

### Шаг 3: Подключите remote репозиторий

После создания репозитория GitHub покажет команды. Используйте эти:

**Вариант A: SSH (рекомендуется если настроен SSH ключ)**
```bash
git remote add origin git@github.com:ваш-username/n8n-nodes-postgres-vector-store-tool.git
```

**Вариант B: HTTPS**
```bash
git remote add origin https://github.com/ваш-username/n8n-nodes-postgres-vector-store-tool.git
```

Замените `ваш-username` на ваш GitHub username!

### Шаг 4: Сделайте commit и push

```bash
# Создайте первый коммит
git commit -m "Initial commit: n8n PGVector Extended node with RLS and Custom SQL"

# Отправьте на GitHub
git push -u origin main
```

Если используете HTTPS, GitHub попросит авторизацию:
- **Username**: ваш GitHub username
- **Password**: используйте **Personal Access Token** (не пароль!)

---

## Personal Access Token (для HTTPS)

Если используете HTTPS и у вас нет токена:

1. Перейдите: https://github.com/settings/tokens
2. **Generate new token** → **Classic**
3. Выберите scopes: `repo` (полный доступ к репозиториям)
4. Скопируйте токен (покажется только один раз!)
5. Используйте токен вместо пароля при `git push`

---

## Быстрый способ (всё в одном скрипте)

Создайте файл и выполните:

```bash
#!/bin/bash
cd /Users/xtimor/Documents/PGVectorStore

# 1. Настройте ваше имя и email
read -p "Ваше имя для Git: " GIT_NAME
read -p "Ваш email для Git: " GIT_EMAIL
git config user.name "$GIT_NAME"
git config user.email "$GIT_EMAIL"

# 2. Добавьте remote (после создания репозитория на GitHub!)
read -p "Ваш GitHub username: " GITHUB_USER
git remote add origin https://github.com/$GITHUB_USER/n8n-nodes-postgres-vector-store-tool.git

# 3. Commit и push
git commit -m "Initial commit: n8n PGVector Extended node with RLS and Custom SQL"
git push -u origin main

echo "✅ Готово! Проверьте: https://github.com/$GITHUB_USER/n8n-nodes-postgres-vector-store-tool"
```

---

## Проверка

После успешного push:

```bash
# Проверьте remote
git remote -v

# Должно показать:
# origin  https://github.com/username/n8n-nodes-postgres-vector-store-tool.git (fetch)
# origin  https://github.com/username/n8n-nodes-postgres-vector-store-tool.git (push)
```

Откройте ваш репозиторий на GitHub - все файлы должны быть там!

---

## Решение проблем

### Ошибка: "Please tell me who you are"

```bash
git config user.name "Ваше Имя"
git config user.email "email@example.com"
```

### Ошибка: "remote origin already exists"

```bash
# Удалите существующий remote
git remote remove origin

# Добавьте заново
git remote add origin https://github.com/username/n8n-nodes-postgres-vector-store-tool.git
```

### Ошибка: "Authentication failed" (для HTTPS)

- Используйте Personal Access Token вместо пароля
- Или настройте SSH ключ: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### Ошибка: "failed to push some refs"

```bash
# Если на GitHub есть файлы, которых нет локально
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## Следующие шаги после push

Добавьте в README.md GitHub URL:

```bash
# Обновите repository URL в package.json
git config --get remote.origin.url
# Скопируйте URL и вставьте в package.json
```

Создайте `.github/workflows` для CI/CD (опционально).

---

**Готово! После выполнения этих шагов ваш код будет на GitHub** 🚀
