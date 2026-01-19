# GitHub Pages 部署指南
本项目已配置为支持GitHub Pages静态网站托管服务，用户可以直接通过 `https://用户名.github.io/sanyueling` 访问游戏。

## 部署要求

### 文件结构要求
- ✅ 所有文件都在根目录或子目录中
- ✅ 使用相对路径引用资源文件
- ✅ 纯静态文件（HTML、CSS、JS、图片、文本）
- ✅ 无需后端服务器或数据库

### 当前项目结构
```
sanyueling/
├── index.html              # 入口文件
├── styles.css              # 样式文件
├── script.js               # JavaScript逻辑
├── plot/                   # 页面设计文件
├── src/                    # 资源文件
│   ├── txt/               # 文本内容
│   └── pic/               # 图片资源
└── .github/workflows/      # GitHub Actions工作流
    └── deploy.yml         # 自动部署配置
```

## 部署步骤

### 方法1：手动部署（推荐初学者）

1. **创建GitHub仓库**
   ```bash
   # 仓库名称建议：sanyueling
   # 或者使用用户名.github.io的格式
   ```

2. **上传文件**
   - 将所有项目文件上传到GitHub仓库的main分支
   - 确保文件结构保持不变

3. **启用GitHub Pages**
   - 进入仓库 Settings
   - 找到 Pages 选项
   - Source选择：Deploy from a branch
   - Branch选择：main / root
   - 点击 Save

4. **访问游戏**
   - 等待几分钟后，访问：`https://你的用户名.github.io/sanyueling`
   - 或者如果仓库名为`用户名.github.io`，则访问：`https://你的用户名.github.io`

### 方法2：自动部署（推荐）

项目已包含GitHub Actions工作流配置 (`.github/workflows/deploy.yml`)：

1. **推送代码到GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/sanyueling.git
   git push -u origin main
   ```

2. **启用GitHub Pages**
   - 进入仓库 Settings → Pages
   - Source选择：GitHub Actions

3. **自动部署**
   - 推送到main分支后，GitHub Actions会自动运行
   - 部署完成后可通过 `https://你的用户名.github.io/sanyueling` 访问

## 路径说明

### 相对路径使用
项目中所有文件引用都使用相对路径：
- `styles.css` - 样式文件
- `script.js` - JavaScript文件
- `plot/p1.txt` - 设计文件
- `src/txt/txt1` - 文本资源
- `src/pic/pic1.png` - 图片资源

### GitHub Pages URL结构
```
https://用户名.github.io/sanyueling/          # 主页
https://用户名.github.io/sanyueling/index.html # 主页（完整路径）
https://用户名.github.io/sanyueling/styles.css # 样式文件
https://用户名.github.io/sanyueling/script.js  # JS文件
```

## 常见问题

### Q: 部署后页面显示404错误？
A: 检查以下几点：
1. 仓库名称是否正确
2. GitHub Pages是否已启用
3. 文件是否上传到正确的分支
4. 等待几分钟让GitHub完成部署

### Q: 图片或文本文件无法加载？
A: 确保：
1. 文件路径使用相对路径
2. 文件名大小写正确
3. 文件确实存在于仓库中

### Q: 本地运行正常，但GitHub Pages上不正常？
A: 可能是路径问题：
1. 检查浏览器开发者工具中的网络请求
2. 确保所有资源都能正确加载
3. 可能需要调整文件路径

## 测试部署

### 本地测试
```bash
# 使用Python内置服务器测试
python3 -m http.server 8000
# 访问 http://localhost:8000
```

### GitHub Pages测试
1. 部署完成后访问在线地址
2. 测试所有功能：
   - 页面滚动
   - 谜题输入
   - 进度保存
   - 渐出动画

## 性能优化建议

### 对于GitHub Pages
1. **文件压缩**：确保CSS和JS文件已压缩
2. **图片优化**：压缩图片文件大小
3. **缓存策略**：GitHub Pages自动处理缓存

### 用户体验优化
1. **加载提示**：已包含加载动画
2. **响应式设计**：支持移动设备
3. **错误处理**：优雅降级处理

## 安全考虑

### GitHub Pages限制
- ✅ 纯静态网站，安全性高
- ✅ 无后端代码暴露风险
- ✅ 支持HTTPS自动配置
- ⚠️ 本地存储数据在用户浏览器中

### 游戏安全
- 谜题答案在客户端验证
- 进度保存在用户本地
- 禁用开发者工具快捷键

## 维护和更新

### 更新游戏内容
1. 修改相应的设计文件（plot/*.txt）
2. 更新文本或图片资源（src/）
3. 推送到GitHub仓库
4. GitHub Actions自动重新部署

### 版本控制
```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0
```

## 监控和统计

### 访问统计
GitHub Pages本身不提供访问统计，可以：
1. 集成Google Analytics
2. 使用其他第三方统计服务
3. 查看GitHub仓库的Traffic数据

### 性能监控
- 使用浏览器开发者工具
- 集成性能监控服务
- 定期检查页面加载速度

## 备份策略

### 代码备份
- GitHub仓库本身就是备份
- 建议定期本地备份
- 使用Git标签标记重要版本

### 数据备份
- 用户游戏进度在本地存储
- 可考虑添加导出/导入功能

---

**部署完成后，用户就可以直接通过浏览器访问游戏，无需任何本地部署步骤！**
