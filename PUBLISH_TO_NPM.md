# 📦 Как опубликовать на npm (npmjs.com)

## Предварительные требования

Перед публикацией нужно:
- ✅ Node.js установлен
- ✅ Проект собран (`npm run build`)
- ✅ Код на GitHub
- ⏳ Аккаунт на npmjs.com (создадим ниже)

---

## Шаг 1: Создайте аккаунт на npm

1. Перейдите на https://www.npmjs.com/signup
2. Заполните форму:
   - **Username** (будет виден в URL пакета)
   - **Email**
   - **Password**
3. Подтвердите email

---

## Шаг 2: Обновите package.json

Перед публикацией нужно исправить плейсхолдеры в `package.json`:

```bash
cd /Users/xtimor/Documents/PGVectorStore
```

Откройте `package.json` и обновите:

```json
{
  "name": "n8n-nodes-pgvector-extended",
  "version": "0.1.0",
  "description": "Extended n8n PGVector Store with RLS and Custom SQL support",
  "author": {
    "name": "xtimor",
    "email": "xtimor@gmail.com"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/xtimor/n8n-nodes-pgvector-extended.git"
  },
  "homepage": "https://github.com/xtimor/n8n-nodes-pgvector-extended"
}
```

**Важные поля:**
- `name` - название пакета (будет в URL: npmjs.com/package/n8n-nodes-pgvector-extended)
- `version` - номер версии (начинаем с 0.1.0)
- `keywords` - помогают в поиске (уже есть правильные)
- `author` - ваши данные
- `repository` - ссылка на GitHub

---

## Шаг 3: Соберите проект

**ВАЖНО:** Сначала нужно установить Node.js!

```bash
# Если Node.js еще не установлен:
brew install node

# Перейдите в проект
cd /Users/xtimor/Documents/PGVectorStore

# Установите зависимости
npm install

# Соберите проект
npm run build
```

После сборки появится папка `dist/` с скомпилированными файлами.

**Проверьте:**
```bash
ls dist/
# Должны быть: credentials/, nodes/, package.json и т.д.
```

---

## Шаг 4: Залогиньтесь в npm

```bash
npm login
```

Введите:
- **Username**: ваш npm username
- **Password**: ваш npm пароль
- **Email**: ваш email

**Проверьте:**
```bash
npm whoami
# Должно показать ваш username
```

---

## Шаг 5: Опубликуйте на npm

```bash
# Из директории проекта
cd /Users/xtimor/Documents/PGVectorStore

# Публикация (впервые)
npm publish --access public
```

**Флаг `--access public`** нужен, чтобы пакет был доступен всем (иначе будет приватный).

---

## Шаг 6: Проверьте публикацию

После успешной публикации:

1. Откройте https://www.npmjs.com/package/n8n-nodes-pgvector-extended
2. Пакет должен быть виден
3. Можно установить: `npm install n8n-nodes-pgvector-extended`

---

## Шаг 7: Установите в n8n через UI

Теперь можно установить через n8n интерфейс:

1. Откройте n8n
2. **Settings** → **Community nodes**
3. **Install a community node**
4. Введите: `n8n-nodes-pgvector-extended`
5. **Install**

n8n скачает пакет с npm и установит автоматически!

---

## Обновление пакета (в будущем)

Когда внесете изменения:

```bash
# 1. Обновите версию в package.json
# Например: "version": "0.1.0" → "0.1.1"

# 2. Соберите
npm run build

# 3. Commit и push на GitHub
git add .
git commit -m "Version 0.1.1: описание изменений"
git push

# 4. Опубликуйте новую версию
npm publish
```

### Семантическое версионирование (SemVer)

- `0.1.0` → `0.1.1` - исправления багов (patch)
- `0.1.0` → `0.2.0` - новые возможности (minor)
- `0.1.0` → `1.0.0` - breaking changes (major)

---

## Автоматизация с GitHub Actions (опционально)

Можно настроить автоматическую публикацию при создании release на GitHub.

Создайте `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm install
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Для этого нужно:
1. Создать npm access token: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Добавить его в GitHub Secrets как `NPM_TOKEN`

---

## Важные замечания

### ⚠️ Перед публикацией проверьте:

1. **Имя пакета уникально:**
   ```bash
   npm view n8n-nodes-pgvector-extended
   # Если пакет не найден - отлично, имя свободно!
   ```

2. **package.json корректен:**
   - Правильные URL GitHub
   - Ваши данные в author
   - Все зависимости указаны

3. **Проект собирается без ошибок:**
   ```bash
   npm run build
   ```

4. **`.gitignore` и `.npmignore` настроены:**
   - В npm НЕ должны попасть: `node_modules/`, `.git/`, файлы разработки

### 🔐 Безопасность

- **НЕ** публикуйте секреты, API ключи, пароли
- Проверьте, что `.env` файлы в `.gitignore`
- Никогда не публикуйте `node_modules/`

### 📝 package.json для n8n

n8n требует специальную структуру в `package.json`:

```json
{
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/PostgresExtended.credentials.js"
    ],
    "nodes": [
      "dist/nodes/VectorStorePGVectorExtended/VectorStorePGVectorExtended.node.js"
    ]
  }
}
```

**У вас уже все правильно настроено!** ✅

---

## Быстрый чеклист публикации

```bash
# 1. Установите Node.js (если нет)
brew install node

# 2. Соберите проект
cd /Users/xtimor/Documents/PGVectorStore
npm install
npm run build

# 3. Создайте npm аккаунт (если нет)
# https://www.npmjs.com/signup

# 4. Залогиньтесь
npm login

# 5. Опубликуйте
npm publish --access public

# 6. Проверьте
# https://www.npmjs.com/package/n8n-nodes-pgvector-extended
```

---

## После публикации

Обновите README.md на GitHub, добавьте npm badge:

```markdown
# n8n-nodes-pgvector-extended

[![npm version](https://badge.fury.io/js/n8n-nodes-pgvector-extended.svg)](https://www.npmjs.com/package/n8n-nodes-pgvector-extended)
[![Downloads](https://img.shields.io/npm/dm/n8n-nodes-pgvector-extended.svg)](https://www.npmjs.com/package/n8n-nodes-pgvector-extended)

## Installation

```bash
# In n8n, go to Settings > Community Nodes > Install
# Enter: n8n-nodes-pgvector-extended
```
```

---

**Готово! После публикации ваша нода будет доступна всем пользователям n8n** 🚀
