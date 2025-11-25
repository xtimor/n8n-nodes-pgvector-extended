# 🚀 Быстрый старт - n8n PGVector Extended

Полное руководство от установки Node.js до работающей ноды в n8n.

## ✅ Шаг 1: Установите Node.js

> [!IMPORTANT]
> Node.js версии 18 или выше обязателен!

**Самый простой способ - через Homebrew:**

```bash
# Установить Homebrew (если нет)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Установить Node.js
brew install node

# Проверить
node -v && npm -v
```

📖 **Другие способы установки:** см. [INSTALL_NODEJS.md](file:///Users/xtimor/Documents/PGVectorStore/INSTALL_NODEJS.md)

---

## ✅ Шаг 2: Соберите проект

```bash
cd /Users/xtimor/Documents/PGVectorStore
./install.sh
```

Скрипт автоматически:
- Установит зависимости (npm install)
- Соберет проект (npm run build)
- Предложит создать link для n8n

---

## ✅ Шаг 3: Настройте PostgreSQL

```bash
./scripts/setup-postgres.sh
```

Скрипт создаст:
- База данных `n8n_pgvector_test`
- Таблицу `n8n_vectors` с pgvector
- Тестовых пользователей с RLS политиками
- Тестовые данные

**Альтернатива - ручная настройка:**
```bash
psql -U postgres -f scripts/setup-postgres.sql
```

---

## ✅ Шаг 4: Установите в n8n

### Вариант A: Автоматически (через npm link)

Уже сделано если вы ответили "y" в `install.sh`!

Если нет:
```bash
npm link
cd ~/.n8n/custom
npm link n8n-nodes-pgvector-extended
```

### Вариант B: Ручное копирование

```bash
mkdir -p ~/.n8n/custom
cp -r dist/* ~/.n8n/custom/
```

---

## ✅ Шаг 5: Перезапустите n8n

```bash
# Если n8n запущен как сервис
n8n restart

# Или просто перезапустите n8n
# Ctrl+C и затем снова n8n
```

---

## ✅ Шаг 6: Настройте credentials в n8n

1. Откройте n8n UI (обычно http://localhost:5678)
2. Перейдите в **Settings** → **Credentials**
3. Нажмите **Add credential**
4. Выберите **Postgres Extended**
5. Заполните:
   - **Host**: `localhost`
   - **Database**: `n8n_pgvector_test`
   - **User**: `postgres` (или ваш пользователь)
   - **Password**: ваш пароль
   - **Port**: `5432`
   - **RLS Role**: оставьте пустым (или укажите `test_user1` для тестирования)

---

## ✅ Шаг 7: Создайте тестовый workflow

### Test 1: Custom SQL Query без RLS

1. Создайте новый workflow
2. Добавьте ноду **PGVector Store Extended**
3. Настройте:
   - **Operation**: Custom SQL Query
   - **SQL Query**:
     ```sql
     SELECT text, metadata, created_at 
     FROM n8n_vectors 
     ORDER BY created_at DESC 
     LIMIT 5;
     ```
4. Execute ✅

**Ожидаемый результат:** Увидите все документы

### Test 2: Custom SQL Query с RLS

1. То же самое, но добавьте:
   - **RLS Role (Override)**: `test_user1`
2. Execute ✅

**Ожидаемый результат:** Увидите только документы с `owner='user1'`

### Test 3: Динамический SQL с параметрами

1. Добавьте ноду **Set** перед PGVector Extended:
   ```json
   {
     "owner": "user1",
     "category": "test"
   }
   ```
2. В PGVector Extended:
   - **SQL Query**:
     ```sql
     SELECT * FROM n8n_vectors 
     WHERE metadata->>'owner' = '{{$json["owner"]}}'
       AND metadata->>'category' = '{{$json["category"]}}';
     ```
3. Execute ✅

---

## 🎯 Что дальше?

### Для продакшена:

- [ ] Интегрируйте с вашей настоящей базой данных
- [ ] Настройте реальные RLS политики
- [ ] Добавьте embeddings модель для vector operations
- [ ] Настройте мониторинг

### Документация:

- 📖 [README.md](file:///Users/xtimor/Documents/PGVectorStore/README.md) - Полная документация
- 📖 [walkthrough.md](file:///Users/xtimor/.gemini/antigravity/brain/b96275cb-34e3-422a-8b64-ed76c7b1b2f4/walkthrough.md) - Детальное руководство

---

## 🆘 Решение проблем

### Нода не появляется в n8n

1. Проверьте, что проект собран: `ls dist/`
2. Проверьте link: `npm list -g --depth=0 | grep pgvector`
3. Перезапустите n8n: `n8n restart`
4. Проверьте логи: `~/.n8n/logs/`

### Ошибка подключения к БД

1. Проверьте, что PostgreSQL запущен: `psql -U postgres -c "SELECT 1;"`
2. Проверьте порт: `lsof -i :5432`
3. Проверьте credentials в n8n

### RLS не работает

1. Проверьте, что RLS включен: `SELECT true FROM pg_tables WHERE tablename = 'n8n_vectors' AND rowsecurity;`
2. Проверьте политики: `SELECT * FROM pg_policies WHERE tablename = 'n8n_vectors';`
3. Убедитесь, что указали правильную роль

---

## 📞 Поддержка

Если что-то не работает:

1. Проверьте версии: `node -v` (должна быть >=18)
2. Проверьте логи n8n: `~/.n8n/logs/`
3. Проверьте PostgreSQL логи
4. Включите debug режим в n8n: `export N8N_LOG_LEVEL=debug`

**Удачи! 🚀**
