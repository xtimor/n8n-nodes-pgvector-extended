```
# Публикация в npm для Postgres Vector Store Tool
```

Для этого нужно:
1. Создать npm access token: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Добавить его в GitHub Secrets как `NPM_TOKEN`

---

## Важные замечания

### ⚠️ Перед публикацией проверьте:

1. **Имя пакета уникально:**
   ```bash
   npm view n8n-nodes-postgres-vector-store-tool
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
    "nodes": [
      "dist/nodes/PostgresVectorStoreTool/PostgresVectorStoreTool.node.js"
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
cd /workspace/n8n-nodes-pgvector-extended
npm install
npm run build

# 3. Создайте npm аккаунт (если нет)
# https://www.npmjs.com/signup

# 4. Залогиньтесь
npm login

# 5. Опубликуйте
npm publish --access public

# 6. Проверьте
# https://www.npmjs.com/package/n8n-nodes-postgres-vector-store-tool
```
