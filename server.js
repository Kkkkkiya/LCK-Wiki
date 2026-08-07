const express = require('express');
const session = require('express-session');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- 视图引擎设置（这就是你缺失的部分） ----------
app.set('view engine', 'ejs');
app.set('views', require('path').join(__dirname, 'views'));

// ---------- 中间件 ----------
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'wiki_secret', resave: false, saveUninitialized: true }));

// ---------- Turso 数据库配置 ----------
const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'libsql://lck-wiki-kkkkiya.aws-ap-northeast-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJfZERQTSlsInR5cCI6IkpXVCI9.eyJhIjoiInciLCJpYXQiOjE3ODYwODM3NDIsImlkjoiMDE5ZmRzTlNtNjYwMS03YThhLWl3ZWlNtZzMZNYzNzlNzhkliwia2IkIjoiMklySXV6c3hGb0NfVVlJVjNWbE02VndqalI3MnZrtVpjM1RadlZCZExpNCIsInJpZC6InJmYTFhZWMOlWewMmQtNGjMS04M2RILTAXyzk4OWM5NWUzYi9J0fACX7Enlgs2Obc70QYwLuxb2ap-T13ViHorUzB0knk2I3Bkjrz5rllkUYPELXUz7udvlmtT8W-I-0ZyxO_DA'
});

// ---------- 初始化数据库 ----------
async function initDB() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT,
            email TEXT
        )
    `);
    await db.execute(`
        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            author TEXT,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// ---------- 数据库操作函数（必须在路由之前定义） ----------
async function getPages() {
    const result = await db.execute('SELECT * FROM pages ORDER BY updatedAt DESC');
    return result.rows;
}

async function getPage(id) {
    const result = await db.execute('SELECT * FROM pages WHERE id = ?', [id]);
    return result.rows[0];
}

async function createPage(title, content, author) {
    await db.execute('INSERT INTO pages (title, content, author) VALUES (?, ?, ?)', [title, content, author]);
}

async function updatePage(id, title, content) {
    await db.execute('UPDATE pages SET title = ?, content = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [title, content, id]);
}

async function deletePage(id) {
    await db.execute('DELETE FROM pages WHERE id = ?', [id]);
}

async function getUser(username) {
    const result = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    return result.rows[0];
}

async function createUser(username, password, email) {
    await db.execute('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, password, email]);
}

// ---------- 路由 ----------
const requireLogin = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

app.get('/', async (req, res) => {
    const pages = await getPages();
    res.render('index', { user: req.session.user, pages });
});

app.get('/login', (req, res) => res.render('login', { user: null }));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await getUser(username);
    if (user && user.password === password) {
        req.session.user = { username };
        res.redirect('/');
    } else {
        res.send('登录失败 <a href=" ">重试</a >');
    }
});

app.get('/register', (req, res) => res.render('register', { user: null }));
app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (await getUser(username)) return res.send('用户名已存在');
    await createUser(username, password, email);
    req.session.user = { username };
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

app.get('/pages/new', requireLogin, (req, res) => {
    res.render('edit', { page: null, user: req.session.user });
});
app.post('/pages', requireLogin, async (req, res) => {
    const { title, content } = req.body;
    await createPage(title, content, req.session.user.username);
    res.redirect('/');
});

app.get('/pages/:id', async (req, res) => {
    const page = await getPage(req.params.id);
    if (!page) return res.status(404).send('页面不存在');
    page.contentHtml = md.render(page.content);
    res.render('view', { page, user: req.session.user });
});

app.get('/pages/:id/edit', requireLogin, async (req, res) => {
    const page = await getPage(req.params.id);
    if (!page) return res.status(404).send('页面不存在');
    res.render('edit', { page, user: req.session.user });
});
app.post('/pages/:id/edit', requireLogin, async (req, res) => {
    const { title, content } = req.body;
    await updatePage(req.params.id, title, content);
    res.redirect(`/pages/${req.params.id}`);
});

app.get('/pages/:id/delete', requireLogin, async (req, res) => {
    await deletePage(req.params.id);
    res.redirect('/');
});

// ---------- 启动服务器 ----------
(async () => {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Wiki 运行在 http://localhost:${PORT}`);
    });
})();