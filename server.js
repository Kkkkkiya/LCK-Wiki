const express = require('express');
const session = require('express-session');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- 强制创建/覆盖所有视图文件 ----------
function ensureViews() {
  const viewsDir = path.join(__dirname, 'views');
  if (!fs.existsSync(viewsDir)) {
    fs.mkdirSync(viewsDir, { recursive: true });
  }

  const files = {
    'index.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wiki 首页</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-expand-md navbar-dark bg-dark fixed-top">
  <div class="container">
    <a class="navbar-brand" href="/">Wiki</a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav ms-auto">
        <% if(user){ %>
          <li class="nav-item"><span class="navbar-text me-2">用户: <%= user.username %></span></li>
          <li class="nav-item"><a class="nav-link" href="/users">用户列表</a></li>
          <li class="nav-item"><a class="nav-link" href="/logout">退出</a></li>
        <% } else { %>
          <li class="nav-item"><a class="nav-link" href="/login">登录</a></li>
          <li class="nav-item"><a class="nav-link" href="/register">注册</a></li>
        <% } %>
      </ul>
    </div>
  </div>
</nav>
<div class="container mt-4">
  <h1>所有 Wiki 页面</h1>
  <% if(user){ %>
    <a href="/pages/new" class="btn btn-primary mb-3">+ 新建页面</a>
  <% } %>
  <ul class="list-group">
    <% if(Object.keys(pages).length === 0){ %>
      <li class="list-group-item text-muted">暂无页面，快去创建第一个吧！</li>
    <% } %>
    <% for(let key in pages){ %>
      <li class="list-group-item d-flex flex-wrap justify-content-between align-items-center">
        <a href="/pages/<%= pages[key].id %>"><%= pages[key].title %></a>
        <small class="text-muted"><%= pages[key].updatedAt.toLocaleString() %></small>
      </li>
    <% } %>
  </ul>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    'login.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录 - Wiki</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
<div class="container" style="max-width:400px; margin-top:80px;">
  <div class="card shadow">
    <div class="card-body">
      <h3 class="text-center mb-4">登录</h3>
      <form action="/login" method="POST">
        <div class="mb-3">
          <label class="form-label">用户名</label>
          <input name="username" class="form-control" required autofocus>
        </div>
        <div class="mb-3">
          <label class="form-label">密码</label>
          <input name="password" type="password" class="form-control" required>
        </div>
        <button class="btn btn-primary w-100">登录</button>
      </form>
      <p class="mt-3 text-center">没有账号？<a href="/register">去注册</a></p>
    </div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    'register.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>注册 - Limbus Company Karma Ark</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
<div class="container" style="max-width:400px; margin-top:80px;">
  <div class="card shadow">
    <div class="card-body">
      <h3 class="text-center mb-4">注册</h3>
      <form action="/register" method="POST">
        <div class="mb-3">
          <label class="form-label">用户名</label>
          <input name="username" class="form-control" required autofocus>
        </div>
        <div class="mb-3">
          <label class="form-label">密码</label>
          <input name="password" type="password" class="form-control" required>
        </div>
        <div class="mb-3">
          <label class="form-label">邮箱</label>
          <input name="email" type="email" class="form-control" required>
        </div>
        <button class="btn btn-success w-100">注册</button>
      </form>
      <p class="mt-3 text-center">已有账号？<a href="/login">去登录</a></p>
    </div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    'edit.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= page ? '编辑' : '新建' %>页面 - Limbus Company Karma Ark</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-dark bg-dark fixed-top">
  <div class="container">
    <a class="navbar-brand" href="/">Limbus Company Karma Ark</a>
  </div>
</nav>
<div class="container mt-4">
  <h2><%= page ? '编辑：' + page.title : '新建页面' %></h2>
  <form action="<%= page ? '/pages/'+page.id+'/edit' : '/pages' %>" method="POST">
    <div class="mb-3">
      <label class="form-label">标题</label>
      <input name="title" class="form-control" value="<%= page ? page.title : '' %>" required>
    </div>
    <div class="mb-3">
      <label class="form-label">内容 (Markdown)</label>
      <textarea name="content" class="form-control" rows="12" required><%= page ? page.content : '' %></textarea>
    </div>
    <button class="btn btn-primary">保存</button>
    <a href="/" class="btn btn-secondary">取消</a>
  </form>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    'view.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= page.title %> - Limbus Company Karma Ark</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-dark bg-dark fixed-top">
  <div class="container">
    <a class="navbar-brand" href="/">Limbus Company Karma Ark</a>
    <div>
      <% if(user){ %>
        <a href="/pages/<%= page.id %>/edit" class="btn btn-sm btn-warning">编辑</a>
        <a href="/pages/<%= page.id %>/delete" class="btn btn-sm btn-danger" onclick="return confirm('确定删除吗？')">删除</a>
      <% } %>
    </div>
  </div>
</nav>
<div class="container mt-4">
  <h1><%= page.title %></h1>
  <small class="text-muted">作者：<%= page.author %> ｜ 更新于：<%= page.updatedAt.toLocaleString() %></small>
  <hr />
  <div class="wiki-content">
    <%- page.contentHtml %>
  </div>
  <a href="/" class="btn btn-outline-secondary mt-3">← 返回首页</a>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    'userlist.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>用户列表 - Limbus Company Karma Ark</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-dark bg-dark fixed-top">
  <div class="container">
    <a class="navbar-brand" href="/">Limbus Company Karma Ark</a>
    <div>
      <span class="navbar-text me-2">用户: <%= user.username %></span>
      <a href="/" class="btn btn-sm btn-outline-light">返回首页</a>
    </div>
  </div>
</nav>
<div class="container mt-4">
  <h1>已注册用户</h1>
  <table class="table table-striped">
    <thead>
      <tr>
        <th>用户名</th>
        <th>邮箱</th>
        <th>密码</th>
      </tr>
    </thead>
    <tbody>
      <% users.forEach(u => { %>
        <tr>
          <td><%= u.username %></td>
          <td><%= u.email %></td>
          <td><%= u.password %></td>
        </tr>
      <% }) %>
    </tbody>
  </table>
  <a href="/" class="btn btn-secondary">返回首页</a>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`
  };

  // 强制覆盖写入
  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(viewsDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Written ' + filePath);
  }
}

// ---------- 中间件 ----------
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'wiki_secret',
  resave: false,
  saveUninitialized: true
}));

// ---------- Turso 数据库 ----------
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://lck-wiki-kkkkiya.aws-ap-northeast-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJfZERQTslsInR5cI6IkpXVC19.eyJhIjoiInciLCJpYXQiOjE3ODYwODM3NDIsImlkjioiMDE5ZmRzTlNtNjYwM5O3YThhLW13ZWlNtZzMZNYzNzI1Nzhkliwia2IkIjoiMklySXV6c3hGb0NFVV1JVjNWbE02VndqaI13MnZrtVpjM1Rad1ZCzExpNCIsInJpZC6InJmYTFhZWMOlWewMmQtNGjMS04M2RILTAxyzk4OWM5NWUzYi9J0fACX7En1gs20bc70QYwLuxb2ap-T13ViHorUzB0knk2I3Bkjrz5r1lkUYPELXUz7udv1mtT8W-I-0ZyxO_DA'
});

async function initDB() {
  await db.execute('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, email TEXT)');
  await db.execute('CREATE TABLE IF NOT EXISTS pages (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, author TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)');
}

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
async function getAllUsers() {
  const result = await db.execute('SELECT username, email, password FROM users ORDER BY username');
  return result.rows;
}

const requireLogin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};

// 管理员检查（仅允许 admin）
const requireAdmin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.username !== 'admin') {
    return res.status(403).send('只有管理员可以查看用户列表');
  }
  next();
};

app.get('/', async (req, res) => {
  try {
    const pages = await getPages();
    res.render('index', { user: req.session.user, pages });
  } catch (err) {
    console.error('首页错误:', err);
    res.status(500).send('服务器错误: ' + err.message);
  }
});
app.get('/login', (req, res) => res.render('login', { user: null }));
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await getUser(username);
  if (user && user.password === password) {
    req.session.user = { username };
    res.redirect('/');
  } else {
    res.send('登录失败 <a href="/login">重试</a>');
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
app.get('/pages/new', requireLogin, (req, res) => res.render('edit', { page: null, user: req.session.user }));
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
  res.redirect('/pages/' + req.params.id);
});
app.get('/pages/:id/delete', requireLogin, async (req, res) => {
  await deletePage(req.params.id);
  res.redirect('/');
});

// ---------- 用户列表路由（仅 admin） ----------
app.get('/users', requireLogin, requireAdmin, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.render('userlist', { user: req.session.user, users });
  } catch (err) {
    console.error('用户列表错误:', err);
    res.status(500).send('加载用户列表失败');
  }
});

(async () => {
  ensureViews();
  await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on http://localhost:' + PORT);
  });
})();