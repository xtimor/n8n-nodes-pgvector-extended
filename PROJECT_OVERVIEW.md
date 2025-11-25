# 📦 Содержимое проекта n8n-nodes-pgvector-extended

## 📂 Структура файлов

```
/Users/xtimor/Documents/PGVectorStore/
│
├── 📄 package.json              # Конфигурация npm пакета
├── 📄 tsconfig.json             # TypeScript настройки
├── 📄 gulpfile.js               # Build скрипты
├── 📄 .prettierrc.js            # Форматирование кода
├── 📄 .gitignore                # Git ignore
├── 📄 LICENSE                   # MIT License
│
├── 📚 Документация:
│   ├── README.md                # Основная документация
│   ├── QUICKSTART.md            # Быстрый старт ⭐ НАЧНИТЕ ЗДЕСЬ
│   └── INSTALL_NODEJS.md        # Как установить Node.js
│
├── 🚀 Установочные скрипты:
│   └── install.sh               # Автоматическая установка проекта
│
├── 🔐 credentials/
│   └── PostgresExtended.credentials.ts    # Credentials с RLS полем
│
├── 🔧 nodes/
│   └── VectorStorePGVectorExtended/
│       ├── VectorStorePGVectorExtended.node.ts   # Главная нода
│       └── postgres.svg                          # Иконка
│
├── 🛠️ utils/
│   └── rlsHelper.ts             # Утилиты для RLS и SQL
│
└── 📊 scripts/
    ├── setup-postgres.sql       # SQL скрипт настройки БД
    └── setup-postgres.sh        # Bash скрипт настройки БД
```

---

## 🎯 Что делает каждый файл

### Основные файлы

- **package.json** - Определяет зависимости и скрипты сборки
- **tsconfig.json** - Настройки компилятора TypeScript
- **install.sh** - Автоматизирует установку и сборку проекта

### Документация

- **QUICKSTART.md** ⭐ - Пошаговая инструкция от А до Я
- **INSTALL_NODEJS.md** - 3 способа установить Node.js на macOS
- **README.md** - Детальная документация API и примеры

### Код ноды

1. **credentials/PostgresExtended.credentials.ts**
   - Расширяет стандартные Postgres credentials
   - Добавляет поле "RLS Role" для Row Level Security

2. **nodes/.../VectorStorePGVectorExtended.node.ts**
   - Главный файл ноды (380 строк)
   - 3 режима: Insert, Retrieve, Custom SQL Query
   - ExtendedPGVectorStore класс с RLS поддержкой

3. **utils/rlsHelper.ts**
   - `executeWithRole()` - выполнение с role switching
   - `executeCustomQuery()` - кастомные SQL запросы
   - `getRLSRole()` - получение роли из параметров/credentials

### Скрипты установки

1. **scripts/setup-postgres.sql**
   - Создает базу данных и таблицы
   - Устанавливает pgvector extension
   - Настраивает RLS политики
   - Добавляет тестовые данные

2. **scripts/setup-postgres.sh**
   - Интерактивный скрипт для запуска .sql файла
   - Проверяет наличие psql
   - Запрашивает параметры подключения

---

## 🚀 Следующие шаги (в порядке выполнения)

### 1️⃣ Установите Node.js

Откройте Terminal и выполните:

```bash
# Через Homebrew (рекомендуется)
brew install node
```

Или см. [INSTALL_NODEJS.md](file:///Users/xtimor/Documents/PGVectorStore/INSTALL_NODEJS.md) для других способов.

### 2️⃣ Соберите проект

```bash
cd /Users/xtimor/Documents/PGVectorStore
./install.sh
```

### 3️⃣ Настройте PostgreSQL

```bash
./scripts/setup-postgres.sh
```

### 4️⃣ Протестируйте в n8n

См. [QUICKSTART.md](file:///Users/xtimor/Documents/PGVectorStore/QUICKSTART.md) для примеров workflows.

---

## 📋 Чеклист готовности

- [x] ✅ Все исходные файлы созданы
- [x] ✅ Документация написана
- [x] ✅ Установочные скрипты готовы
- [x] ✅ SQL скрипты для PostgreSQL готовы
- [ ] ⏳ Node.js нужно установить
- [ ] ⏳ Проект нужно собрать (npm build)
- [ ] ⏳ PostgreSQL нужно настроить
- [ ] ⏳ Ноду нужно связать с n8n

---

## 💡 Ключевые возможности

### 🔐 Row Level Security (RLS)

```typescript
// Роль автоматически устанавливается перед запросом
SET LOCAL ROLE "test_user1";
SELECT * FROM n8n_vectors;  // Вернет только данные user1
```

### 🛠️ Custom SQL Queries

```sql
-- С поддержкой n8n expressions
SELECT * FROM n8n_vectors 
WHERE metadata->>'owner' = '{{$json["userId"]}}'
ORDER BY created_at DESC;
```

### 🔄 Vector Operations

- Insert documents (с RLS)
- Retrieve similar documents (с RLS)
- Совместимость с LangChain

---

## 🎓 Полезные ссылки

- [n8n Documentation](https://docs.n8n.io/)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [pgvector Extension](https://github.com/pgvector/pgvector)
- [Node.js Downloads](https://nodejs.org/)

---

**Начните с [QUICKSTART.md](file:///Users/xtimor/Documents/PGVectorStore/QUICKSTART.md)** 🚀
