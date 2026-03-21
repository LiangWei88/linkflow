# Tailwind CSS 使用规范

使用 **Tailwind CSS 3.x** 作为主要样式方案。

## 核心原则

1. **优先写 Tailwind 原子类**
2. **重复样式组合 → 使用 @apply 抽取自定义类**
3. **命名约定**  
   - 组件：`PascalCase`（如 `UserProfile`）  
   - 自定义类：`kebab-case`（如 `.btn-primary`）

## 最佳实践

- 响应式：`sm: md: lg: xl:` 前缀
- 暗黑模式：`dark:` 前缀
- 主题统一：在 `tailwind.config.js` 扩展 `colors`、`fontFamily` 等
- 使用 **JIT** 模式，保持 CSS 体积最小

## 推荐写法

```jsx
<div className="flex min-h-screen flex-col items-center p-6 md:p-10">
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
    标题
  </h1>
</div>
```

```css
.btn-primary {
  @apply px-5 py-2.5 bg-blue-600 text-white font-medium
         rounded-lg hover:bg-blue-700 transition-colors;
}
```

## 注意事项

- 单个元素 Tailwind 类尽量控制在 8–10 个以内
- 优先组件拆分，其次 @apply，最后才写原生 CSS
- 项目颜色、间距、字体等统一在配置文件管理

（约 680 字符）