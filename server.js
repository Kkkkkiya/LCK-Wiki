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

// ---------- 全局变量：背景 ----------
let globalBackground = '#f8f9fa';

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
  <style>
    body { background: <%= background %>; }
    .container { background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px; margin-top: 80px; }
  </style>
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
          <% if(user.is_reviewer || user.is_admin){ %>
            <li class="nav-item"><a class="nav-link" href="/pending">待审核</a></li>
          <% } %>
          <% if(user.is_bg_editor || user.is_admin){ %>
            <li class="nav-item"><a class="nav-link" href="/admin/background">修改背景</a></li>
          <% } %>
          <% if(user.is_admin){ %>
            <li class="nav-item"><a class="nav-link" href="/admin/users">用户管理</a></li>
          <% } %>
          <% if(user.is_admin || user.is_reviewer){ %>
            <li class="nav-item"><a class="nav-link" href="/users">用户列表</a></li>
          <% } %>
          <li class="nav-item"><a class="nav-link" href="/logout">退出</a></li>
        <% } else { %>
          <li class="nav-item"><a class="nav-link" href="/login">登录</a></li>
          <li class="nav-item"><a class="nav-link" href="/register">注册</a></li>
          <li class="nav-item"><a class="nav-link" href="/forgot-password">忘记密码</a></li>
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
  <style>
    body { background: <%= background %>; }
    .login-card { max-width: 400px; margin: 80px auto; }
  </style>
</head>
<body class="bg-light">
<div class="container">
  <div class="login-card">
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
        <p class="text-center"><a href="/forgot-password">忘记密码？</a></p>
      </div>
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
  <style>
    body { background: <%= background %>; }
    .register-card { max-width: 400px; margin: 80px auto; }
  </style>
</head>
<body class="bg-light">
<div class="container">
  <div class="register-card">
    <div class="card shadow">
      <div class="card-body">
        <h3 class="text-center mb-4">注册</h3>
        <form action="/register" method="POST">
          <div class="mb-3">
            <label class="form-label">用户名</label>
            <input name="username" class="form-control" required autofocus>
          </div>
          <div class="mb-3">
            <label class="form-label">密码 (只能包含大小写字母、数字、下划线，至少6位)</label>
            <input name="password" type="password" class="form-control" required pattern="[A-Za-z0-9_]{6,}">
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
  <style>
    body { background: <%= background %>; }
    .container { background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px; margin-top: 80px; }
  </style>
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
  <style>
    body { background: <%= background %>; }
    .container { background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px; margin-top: 80px; }
    .wiki-content { line-height: 1.8; }
  </style>
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
  <style>
    body { background: <%= background %>; }
    .container { background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px; margin-top: 80px; }
  </style>
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
        <% if(showSensitive){ %>
          <th>邮箱</th>
          <th>密码</th>
        <% } %>
      </tr>
    </thead>
    <tbody>
      <% users.forEach(u => { %>
        <tr>
          <td><%= u.username %></td>
          <% if(showSensitive){ %>
            <td><%= u.email %></td>
            <td><%= u.password %></td>
          <% } %>
        </tr>
      <% }) %>
    </tbody>
  </table>
  <a href="/" class="btn btn-secondary">返回首页</a>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    'forgot-password.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>找回密码 - Wiki</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: <%= background %>; }
    .forgot-card { max-width: 400px; margin: 80px auto; }
  </style>
</head>
<body>
<div class="container">
  <div class="forgot-card">
    <div class="card shadow">
      <div class="card-body">
        <h3 class="text-center mb-4">找回密码</h3>
        <p class="text-muted">请输入您的用户名和注册邮箱，验证通过后可重置密码。</p>
        <form action="/forgot-password" method="POST">
          <div class="mb-3">
            <label class="form-label">用户名</label>
            <input name="username" class="form-control" required autofocus>
          </div>
          <div class="mb-3">
            <label class="form-label">邮箱</label>
            <input name="email" type="email" class="form-control" required>
          </div>
          <button class="btn btn-primary w-100">验证</button>
        </form>
        <p class="mt-3 text-center"><a href="/login">返回登录</a></p>
      </div>
    </div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    'reset-password.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>重置密码 - Wiki</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: <%= background %>; }
    .reset-card { max-width: 400px; margin: 80px auto; }
  </style>
</head>
<body>
<div class="container">
  <div class="reset-card">
    <div class="card shadow">
      <div class="card-body">
        <h3 class="text-center mb-4">重置密码</h3>
        <form action="/reset-password" method="POST">
          <div class="mb-3">
            <label class="form-label">新密码 (只能包含大小写字母、数字、下划线，至少6位)</label>
            <input name="new_password" type="password" class="form-control" required pattern="[A-Za-z0-9_]{6,}">
          </div>
          <div class="mb-3">
            <label class="form-label">确认密码</label>
            <input name="confirm_password" type="password" class="form-control" required>
          </div>
          <button class="btn btn-success w-100">重置密码</button>
        </form>
        <p class="mt-3 text-center"><a href="/login">返回登录</a></p>
      </div>
    </div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    'pending.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>待审核页面 - Limbus Company Karma Ark</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: <%= background %>; }
    .container { background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px; margin-top: 80px; }
  </style>
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
  <h1>待审核页面</h1>
  <% if(pages.length === 0){ %>
    <p class="text-muted">暂无待审核页面。</p>
  <% } else { %>
    <ul class="list-group">
      <% pages.forEach(p => { %>
        <li class="list-group-item d-flex flex-wrap justify-content-between align-items-center">
          <a href="/pages/<%= p.id %>"><%= p.title %></a>
          <span class="text-muted">作者: <%= p.author %></span>
          <div>
            <form action="/pending/<%= p.id %>/approve" method="POST" style="display:inline;">
              <button class="btn btn-sm btn-success">通过</button>
            </form>
            <form action="/pending/<%= p.id %>/reject" method="POST" style="display:inline;">
              <button class="btn btn-sm btn-danger">拒绝</button>
            </form>
          </div>
        </li>
      <% }) %>
    </ul>
  <% } %>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    'admin-background.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>修改网站背景 - Limbus Company Karma Ark</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: <%= background %>; }
    .container { background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px; margin-top: 80px; }
    .preview { border: 2px solid #ccc; padding: 20px; border-radius: 8px; }
  </style>
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
  <h1>修改网站背景</h1>
  <form action="/admin/background" method="POST">
    <div class="mb-3">
      <label class="form-label">背景颜色代码 (如 #f8f9fa) 或 图片URL</label>
      <input name="background" class="form-control" value="<%= currentBackground %>" required>
    </div>
    <button class="btn btn-primary">保存</button>
  </form>
  <div class="mt-4">
    <h5>预览</h5>
    <div class="preview" style="background: <%= currentBackground %>;">
      <p class="text-muted">此处预览背景效果</p>
    </div>
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`,

    'admin-users.ejs': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>用户管理 - Limbus Company Karma Ark</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background: <%= background %>; }
    .container { background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px; margin-top: 80px; }
  </style>
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
  <h1>用户管理</h1>
  <table class="table table-striped">
    <thead>
      <tr>
        <th>用户名</th>
        <th>邮箱</th>
        <th>审核员</th>
        <th>背景编辑者</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <% users.forEach(u => { %>
        <tr>
          <td><%= u.username %></td>
          <td><%= u.email %></td>
          <td><%= u.is_reviewer ? '✅' : '❌' %></td>
          <td><%= u.is_bg_editor ? '✅' : '❌' %></td>
          <td>
            <form action="/admin/users/<%= u.username %>/role" method="POST" style="display:inline;">
              <input type="hidden" name="field" value="is_reviewer">
              <input type="hidden" name="value" value="<%= u.is_reviewer ? 0 : 1 %>">
              <button class="btn btn-sm <%= u.is_reviewer ? 'btn-warning' : 'btn-outline-secondary' %>">
                <%= u.is_reviewer ? '撤销审核' : '设为审核' %>
              </button>
            </form>
            <form action="/admin/users/<%= u.username %>/role" method="POST" style="display:inline;">
              <input type="hidden" name="field" value="is_bg_editor">
              <input type="hidden" name="value" value="<%= u.is_bg_editor ? 0 : 1 %>">
              <button class="btn btn-sm <%= u.is_bg_editor ? 'btn-warning' : 'btn-outline-secondary' %>">
                <%= u.is_bg_editor ? '撤销背景' : '设为背景' %>
              </button>
            </form>
          </td>
        </tr>
      <% }) %>
    </tbody>
  </table>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`
  };

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

// ---------- 数据库初始化 + 迁移 ----------
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://lck-wiki-kkkkiya.aws-ap-northeast-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJfZERQTslsInR5cI6IkpXVC19.eyJhIjoiInciLCJpYXQiOjE3ODYwODM3NDIsImlkjioiMDE5ZmRzTlNtNjYwM5O3YThhLW13ZWlNtZzMZNYzNzI1Nzhkliwia2IkIjoiMklySXV6c3hGb0NFVV1JVjNWbE02VndqaI13MnZrtVpjM1Rad1ZCzExpNCIsInJpZC6InJmYTFhZWMOlWewMmQtNGjMS04M2RILTAxyzk4OWM5NWUzYi9J0fACX7En1gs20bc70QYwLuxb2ap-T13ViHorUzB0knk2I3Bkjrz5r1lkUYPELXUz7udv1mtT8W-I-0ZyxO_DA'
});

async function initDB() {
  await db.execute('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, email TEXT, is_reviewer INTEGER DEFAULT 0, is_bg_editor INTEGER DEFAULT 0)');
  await db.execute('CREATE TABLE IF NOT EXISTS pages (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, author TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT "pending")');
  await db.execute('CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)');

  const tableInfo = await db.execute('PRAGMA table_info(users)');
  const userColumns = tableInfo.rows.map(r => r.name);
  if (!userColumns.includes('is_reviewer')) {
    await db.execute('ALTER TABLE users ADD COLUMN is_reviewer INTEGER DEFAULT 0');
  }
  if (!userColumns.includes('is_bg_editor')) {
    await db.execute('ALTER TABLE users ADD COLUMN is_bg_editor INTEGER DEFAULT 0');
  }

  const pageInfo = await db.execute('PRAGMA table_info(pages)');
  const pageColumns = pageInfo.rows.map(r => r.name);
  if (!pageColumns.includes('status')) {
    await db.execute('ALTER TABLE pages ADD COLUMN status TEXT DEFAULT "pending"');
  }

  // 修复：使用单引号而非双引号
  const bgRow = await db.execute("SELECT value FROM config WHERE key = 'background'");
  if (bgRow.rows.length === 0) {
    await db.execute("INSERT INTO config (key, value) VALUES ('background', '#f8f9fa')");
  } else {
    globalBackground = bgRow.rows[0].value;
  }
}

// ---------- 数据库操作函数 ----------
async function getPages() {
  const result = await db.execute('SELECT * FROM pages WHERE status = "approved" ORDER BY updatedAt DESC');
  return result.rows;
}
async function getPage(id) {
  const result = await db.execute('SELECT * FROM pages WHERE id = ?', [id]);
  return result.rows[0];
}
async function createPage(title, content, author, status = 'pending') {
  await db.execute('INSERT INTO pages (title, content, author, status) VALUES (?, ?, ?, ?)', [title, content, author, status]);
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
  await db.execute('INSERT INTO users (username, password, email, is_reviewer, is_bg_editor) VALUES (?, ?, ?, 0, 0)', [username, password, email]);
}
async function getAllUsers() {
  const result = await db.execute('SELECT username, email, password, is_reviewer, is_bg_editor FROM users ORDER BY username');
  return result.rows;
}
async function getPendingPages() {
  const result = await db.execute('SELECT * FROM pages WHERE status = "pending" ORDER BY updatedAt DESC');
  return result.rows;
}
async function approvePage(id) {
  await db.execute('UPDATE pages SET status = "approved" WHERE id = ?', [id]);
}
async function rejectPage(id) {
  await db.execute('DELETE FROM pages WHERE id = ?', [id]);
}
async function updateUserRole(username, field, value) {
  await db.execute(`UPDATE users SET ${field} = ? WHERE username = ?`, [value, username]);
}
async function getConfig(key) {
  const result = await db.execute('SELECT value FROM config WHERE key = ?', [key]);
  return result.rows[0] ? result.rows[0].value : null;
}
async function setConfig(key, value) {
  await db.execute('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value]);
}

// ---------- 中间件：注入背景 ----------
app.use(async (req, res, next) => {
  const bg = await getConfig('background');
  if (bg) globalBackground = bg;
  res.locals.background = globalBackground;
  next();
});

// ---------- 权限中间件 ----------
const requireLogin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.username !== 'admin') return res.status(403).send('只有管理员可以访问');
  next();
};
const requireReviewer = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  const user = req.session.user;
  if (user.username === 'admin' || user.is_reviewer) return next();
  res.status(403).send('权限不足');
};
const requireBgEditor = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  const user = req.session.user;
  if (user.username === 'admin' || user.is_bg_editor) return next();
  res.status(403).send('权限不足');
};

// ---------- 路由 ----------
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
    req.session.user = { 
      username: user.username,
      is_reviewer: !!user.is_reviewer,
      is_bg_editor: !!user.is_bg_editor,
      is_admin: user.username === 'admin'
    };
    res.redirect('/');
  } else {
    res.send('登录失败 <a href="/login">重试</a>');
  }
});

app.get('/register', (req, res) => res.render('register', { user: null }));
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!/^[A-Za-z0-9_]{6,}$/.test(password)) {
    return res.send('密码格式错误：只能包含大小写字母、数字和下划线，且至少6位');
  }
  if (await getUser(username)) return res.send('用户名已存在');
  await createUser(username, password, email);
  req.session.user = { username, is_reviewer: 0, is_bg_editor: 0, is_admin: false };
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// 忘记密码
app.get('/forgot-password', (req, res) => res.render('forgot-password', { user: null }));
app.post('/forgot-password', async (req, res) => {
  const { username, email } = req.body;
  const user = await getUser(username);
  if (user && user.email === email) {
    req.session.reset_allowed = true;
    req.session.reset_user = username;
    res.redirect('/reset-password');
  } else {
    res.send('用户名或邮箱不匹配 <a href="/forgot-password">重试</a>');
  }
});

app.get('/reset-password', (req, res) => {
  if (!req.session.reset_allowed) return res.redirect('/forgot-password');
  res.render('reset-password', { user: null });
});
app.post('/reset-password', async (req, res) => {
  if (!req.session.reset_allowed) return res.redirect('/forgot-password');
  const { new_password, confirm_password } = req.body;
  if (new_password !== confirm_password) return res.send('两次密码不一致');
  if (!/^[A-Za-z0-9_]{6,}$/.test(new_password)) {
    return res.send('密码格式错误：只能包含大小写字母、数字和下划线，且至少6位');
  }
  const username = req.session.reset_user;
  await db.execute('UPDATE users SET password = ? WHERE username = ?', [new_password, username]);
  req.session.reset_allowed = false;
  req.session.reset_user = null;
  res.redirect('/login');
});

// 页面管理
app.get('/pages/new', requireLogin, (req, res) => res.render('edit', { page: null, user: req.session.user }));
app.post('/pages', requireLogin, async (req, res) => {
  const { title, content } = req.body;
  const user = req.session.user;
  let status = 'pending';
  if (user.is_admin || user.is_reviewer) status = 'approved';
  await createPage(title, content, user.username, status);
  res.redirect('/');
});
app.get('/pages/:id', async (req, res) => {
  const page = await getPage(req.params.id);
  if (!page) return res.status(404).send('页面不存在');
  if (page.status === 'pending') {
    const user = req.session.user;
    if (!user || (user.username !== page.author && !user.is_reviewer && !user.is_admin)) {
      return res.status(404).send('页面不存在或未审核');
    }
  }
  page.contentHtml = md.render(page.content);
  res.render('view', { page, user: req.session.user });
});
app.get('/pages/:id/edit', requireLogin, async (req, res) => {
  const page = await getPage(req.params.id);
  if (!page) return res.status(404).send('页面不存在');
  if (page.author !== req.session.user.username && !req.session.user.is_admin) {
    return res.status(403).send('只能编辑自己的页面');
  }
  res.render('edit', { page, user: req.session.user });
});
app.post('/pages/:id/edit', requireLogin, async (req, res) => {
  const { title, content } = req.body;
  const page = await getPage(req.params.id);
  if (!page) return res.status(404).send('页面不存在');
  if (page.author !== req.session.user.username && !req.session.user.is_admin) {
    return res.status(403).send('只能编辑自己的页面');
  }
  await updatePage(req.params.id, title, content);
  const user = req.session.user;
  if (!user.is_admin && !user.is_reviewer) {
    await db.execute('UPDATE pages SET status = "pending" WHERE id = ?', [req.params.id]);
  }
  res.redirect('/pages/' + req.params.id);
});
app.get('/pages/:id/delete', requireLogin, async (req, res) => {
  const page = await getPage(req.params.id);
  if (!page) return res.status(404).send('页面不存在');
  if (page.author !== req.session.user.username && !req.session.user.is_admin) {
    return res.status(403).send('只能删除自己的页面');
  }
  await deletePage(req.params.id);
  res.redirect('/');
});

// 待审核列表
app.get('/pending', requireLogin, requireReviewer, async (req, res) => {
  const pages = await getPendingPages();
  res.render('pending', { user: req.session.user, pages });
});
app.post('/pending/:id/approve', requireLogin, requireReviewer, async (req, res) => {
  await approvePage(req.params.id);
  res.redirect('/pending');
});
app.post('/pending/:id/reject', requireLogin, requireReviewer, async (req, res) => {
  await rejectPage(req.params.id);
  res.redirect('/pending');
});

// ---------- 用户列表 ----------
app.get('/users', requireLogin, async (req, res) => {
  const user = req.session.user;
  if (!user.is_admin && !user.is_reviewer) {
    return res.status(403).send('权限不足');
  }
  let users;
  if (user.is_admin) {
    users = await getAllUsers();
    res.render('userlist', { user: req.session.user, users, showSensitive: true });
  } else {
    const result = await db.execute('SELECT username FROM users ORDER BY username');
    users = result.rows;
    res.render('userlist', { user: req.session.user, users, showSensitive: false });
  }
});

// 管理员：用户管理
app.get('/admin/users', requireLogin, requireAdmin, async (req, res) => {
  const users = await getAllUsers();
  res.render('admin-users', { user: req.session.user, users });
});
app.post('/admin/users/:username/role', requireLogin, requireAdmin, async (req, res) => {
  const { username } = req.params;
  const { field, value } = req.body;
  if (!['is_reviewer', 'is_bg_editor'].includes(field)) return res.status(400).send('无效字段');
  await updateUserRole(username, field, parseInt(value));
  res.redirect('/admin/users');
});

// 管理员/背景编辑者：修改背景
app.get('/admin/background', requireLogin, requireBgEditor, async (req, res) => {
  const currentBackground = await getConfig('background') || '#f8f9fa';
  res.render('admin-background', { user: req.session.user, currentBackground });
});
app.post('/admin/background', requireLogin, requireBgEditor, async (req, res) => {
  const { background } = req.body;
  await setConfig('background', background);
  globalBackground = background;
  res.redirect('/admin/background');
});

// ---------- 启动 ----------
(async () => {
  ensureViews();
  await initDB();
  const bg = await getConfig('background');
  if (bg) globalBackground = bg;
  app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on http://localhost:' + PORT);
  });
})();