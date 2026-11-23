<template>
  <div class="reading-panel cv-view" role="region" aria-label="个人简历" tabindex="0">
    <article class="cv-document">
      <!-- 基本信息 -->
      <section class="bio">
        <div class="left">
          <h1>谢添宇</h1>
          <p><a href="http://www.xie-bro.top/" target="_blank" rel="noopener noreferrer">http://www.xie-bro.top/</a></p>
        </div>
        <div class="right">
          <p>男 | 1997</p>
          <p>1416849251@qq.com</p>
          <p>微信: xty1416849251</p>
        </div>
      </section>

      <!-- 专业技能 -->
      <section class="skills">
        <h3>专业技能</h3>
        <div class="categories">
          <div class="category">
            <h4>AI 驱动开发</h4>
            <ul>
              <li><strong>Hermes + DeepSeek / GPT Codex</strong>：应用于需求分析、方案规划与代码实现，作为个人项目的主要开发工具。</li>
              <li><strong>需求分析与任务拆解</strong>：通过与 Agent 协作明确产品需求及实现方案，将开发计划转化为任务清单（todoList），分项推进实施。</li>
              <li><strong>多 Agent 协同</strong>：依据项目规划与任务清单组织多个 Agent 协作，推进开发任务。</li>
              <li><strong>跨领域项目实践</strong>：通过 Agent 协同实现全栈应用、桌面工具及游戏项目，拓展个人产品的实现范围。</li>
            </ul>
          </div>
          <div class="category">
            <h4>前端技术栈与工程实践</h4>
            <ul>
              <li><strong>JavaScript / TypeScript / HTML / CSS</strong>：掌握异步编程、模块化、类型与泛型应用，以及 Flex / Grid 布局和响应式设计。</li>
              <li><strong>Vue 2/3 及生态</strong>：使用 Vue Router、Vuex / Pinia、Composition API 与 Vite，开展业务组件封装及复杂页面开发。</li>
              <li><strong>uni-app / 微信小程序</strong>：具备移动应用全流程开发经验，独立完成 CRM 小程序开发与发布。</li>
              <li><strong>Git</strong>：熟悉团队协作流程与分支管理。</li>
            </ul>
          </div>
          <div class="category">
            <h4>低代码与交互可视化</h4>
            <ul>
              <li><strong>低代码平台</strong>：具备组件渲染机制、配置项设计、元数据建模与可复用业务组件开发经验。</li>
              <li><strong>ECharts / AntV / Canvas / SVG</strong>：开发数据看板、图表组件、工艺流程图及绘图工具；具备 Three.js 模型渲染与基础交互实践经验。</li>
              <li><strong>bpmn.js / LogicFlow</strong>：熟悉业务流程图工具集成与交互开发。</li>
            </ul>
          </div>
          <div class="category">
            <h4>AI 应用开发</h4>
            <ul>
              <li><strong>Dify / 大模型 API / 提示词设计</strong>：集成工作流与模型接口，实现自然语言转 SQL 查询及结果可视化。</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="experience">
        <h3>企业级项目</h3>
        <div class="project">
          <header>
            <h4>协同办公系统 <span class="date">(2025年4月 - 2026年8月)</span></h4>
            <p class="company">OA 系统 | 前端开发工程师</p>
          </header>
          <div class="description">
            <p>蒙电协同办公系统，支持复杂业务流程与多端协同编辑。</p>
            <ul>
              <li>公文管理：集成金山 WPS SDK，并直接调用 WPS API 实现 SDK 之外的扩展功能。</li>
              <li>电子签章：完成 OFD 电子公章功能集成与调试。</li>
              <li>系统维护：负责上线前后的缺陷修复、需求变更与日常运维。</li>
            </ul>
          </div>
        </div>
        <div class="project">
          <header>
            <h4>才匠云平台 <span class="date">(2022年4月 - 2025年4月)</span></h4>
            <p class="company">智造 PaaS 平台 | 前端开发工程师</p>
          </header>
          <div class="description">
            <p>公司自主研发的制造业 PaaS 平台，提供低代码应用构建、数据可视化及 AI 辅助分析功能。</p>
            <ul>
              <li>低代码平台：参与平台架构设计，实现基于拖拽与配置的页面生成机制，封装 20 余个可复用业务组件。</li>
              <li>微信小程序：独立开发 CRM 系统，主导产品设计、开发及发布全流程。</li>
              <li>AI 应用：基于 Dify 工作流开发智能图表功能，将自然语言转换为 SQL 查询，并以图表及报表呈现查询结果。</li>
              <li>元数据建模：参与功能设计与实现，基于实体模型生成 CRUD 页面，与低代码平台结合，减少重复页面开发。</li>
            </ul>
          </div>
        </div>
        <div class="project">
          <header>
            <h4>SMES 机加工综合管理平台 <span class="date">(2021年2月 - 2022年1月)</span></h4>
            <p class="company">制造企业管理平台 | 前端开发工程师</p>
          </header>
          <div class="description">
            <p>面向制造企业的综合管理平台，支持 PC 端与移动端业务操作及实时数据监控。</p>
            <ul>
              <li>数据可视化：基于 ECharts 与 WebSocket 开发仪表盘及驾驶舱，实现监控数据实时更新。</li>
              <li>工艺路线：基于 Canvas 开发工艺流程图，实现流程交互与动画展示。</li>
              <li>跨端应用：使用 uni-app 开发移动应用，参与需求分析、开发及上线全流程。</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="personal-projects">
        <h3>个人项目</h3>
        <div class="projects">
          <div class="project-item">
            <header>
              <h4>Drawer · 桌面内容抽屉 <span class="date">(2026) · vibe</span></h4>
            </header>
            <p class="stack">C# / .NET 10 / WPF / Windows Shell（Windows）；Swift 6 / AppKit（macOS）</p>
            <p>包含 Windows 与 macOS 原生实现，通过二维画布管理文本、截图及文件，支持边缘停靠、多抽屉、全局快捷键、跨应用拖放与布局持久化。</p>
            <p>Windows 版集成引用中转、目录收纳及系统文件操作；macOS 版适配菜单栏与触控板交互，当前迭代版本待 Mac 编译与实机验收。</p>
            <p><strong>DrawerX（开发中）</strong>：面向 Windows 与 macOS 的跨平台后续版本。</p>
          </div>
          <div class="project-item">
            <header>
              <h4>蟹小箱 · Windows 系统工具箱 <span class="date">(2026) · vibe</span></h4>
            </header>
            <p class="stack">C# / .NET 10 / WPF / 模块化桌面应用</p>
            <p>集成系统体检、垃圾清理、磁盘分析、文件整理及启动项管理等 11 类功能，采用模块化架构与共享 UI 组件，统一导航、主题及任务协调。</p>
            <p>文件操作支持修改预览、冲突检查、文件指纹校验及撤销记录；提供集成运行时的单文件便携版本，本地功能支持免登录、离线运行。</p>
          </div>
          <div class="project-item">
            <header>
              <h4>web-store · 虚拟商品电商平台 <span class="date">(2026) · vibe</span></h4>
              <a href="https://github.com/XXXXXie1997/webStore" target="_blank" rel="noopener noreferrer">源码链接</a>
            </header>
            <p class="stack">Next.js / TypeScript / Prisma / MySQL / Tailwind CSS / JWT</p>
            <p>项目包含商城前台、管理后台及服务端 API，支持商品与订单管理、自动发货、VIP 会员、代理分销及多分站运营，集成虎皮椒与易收米支付通道。</p>
            <p>使用 Prisma 与 MySQL 实现数据持久化，基于 Linux 与 PM2 部署，已为多个客户完成独立部署与交付。</p>
          </div>
          <div class="project-item">
            <header>
              <h4>ALCode · AI 低代码页面生成引擎 <span class="date">(2026) · vibe</span></h4>
              <a href="https://github.com/XXXXXie1997/ALCode" target="_blank" rel="noopener noreferrer">源码链接</a>
            </header>
            <p class="stack">组件 Schema / 增量 Patch / SSE</p>
            <p>基于组件 Schema 与语义描述，将自然语言转换为可渲染的页面结构及增量 Patch。通过规则校验与循环修复约束模型输出，支持 SSE 流式反馈、API Key 鉴权及调用链追踪。</p>
          </div>
          <div class="project-item">
            <header>
              <h4>MoUI · 低代码平台 <span class="date">(2026) · vibe</span></h4>
              <a href="https://github.com/XXXXXie1997/mo-ui" target="_blank" rel="noopener noreferrer">源码链接</a>
            </header>
            <p class="stack">React / TypeScript / Vite / Schema 驱动渲染</p>
            <p>基于组件注册与 Schema 驱动渲染的低代码平台原型，包含节点树、可视化画布、属性面板及 JSON 导入导出，支持页面结构编辑与组件配置。</p>
          </div>
          <div class="project-item">
            <header>
              <h4>checkin-app · 日报考勤管理系统 <span class="date">(2026) · vibe</span></h4>
              <a href="https://github.com/XXXXXie1997/checkin-app" target="_blank" rel="noopener noreferrer">源码链接</a>
            </header>
            <p class="stack">Next.js / TypeScript / Prisma / MySQL / ReactFlow / JWT</p>
            <p>集成 GPS 定位打卡、日报、多级审批、消息通知及数据导出；基于 ReactFlow 配置审批流程，采用 JWT 鉴权及 Prisma / MySQL 数据持久化。</p>
          </div>
          <div class="project-item">
            <header>
              <h4>pulse-core · 2D 像素风俯视角 Roguelite 射击游戏 <span class="date">(2026) · vibe</span></h4>
              <a href="https://github.com/XXXXXie1997/pulse-core" target="_blank" rel="noopener noreferrer">源码链接</a>
            </header>
            <p class="stack">Godot 4 / GDScript / 2D 像素风</p>
            <p>以网格化供电电路构筑为核心的俯视角射击游戏，通过线路拓扑与模块组合驱动武器运行及战斗效果。</p>
            <p>实现房间探索、战斗、装备改造、商店、存档与局外成长，配套规则测试及内容验证脚本；目前处于可玩原型阶段。</p>
          </div>
          <div class="project-item">
            <header>
              <h4>money-tracker · 单页面记账应用 <span class="date">(2026) · vibe</span></h4>
              <a href="https://github.com/XXXXXie1997/money-tracker-claw" target="_blank" rel="noopener noreferrer">源码链接</a>
            </header>
            <p class="stack">移动端适配 / 本地存储 / 状态管理</p>
            <p>移动端单页面记账应用，支持账目记录、数据统计、本地存储及数据导入导出，包含移动端适配与状态管理。</p>
          </div>
          <div class="project-item">
            <header>
              <h4>画板一张 <span class="date">(2023)</span></h4>
              <a href="https://github.com/XXXXXie1997/canvasDrawingBoard-vite" target="_blank" rel="noopener noreferrer">源码链接</a>
            </header>
            <p class="stack">Vue 3 / TypeScript / Canvas</p>
            <p>基于 Canvas 开发绘图工具，支持笔刷配置、图层操作、撤销重做及画布导出，结合 Vue 组件管理绘图交互与画布状态。</p>
          </div>
          <div class="project-item">
            <header>
              <h4>Mo-UI 组件库 <span class="date">(2020)</span></h4>
              <a href="https://github.com/XXXXXie1997/Mo-UI-Demo1" target="_blank" rel="noopener noreferrer">源码链接</a>
            </header>
            <p>基于 Vue 2 封装 Button、Collapse、Popover、Toast 等基础组件，实践组件通信、生命周期及交互状态管理。</p>
          </div>
          <div class="project-item">
            <header>
              <h4>任意门导航 <span class="date">(2019)</span></h4>
              <a href="https://github.com/XXXXXie1997/guide-demo" target="_blank" rel="noopener noreferrer">源码链接</a>
            </header>
            <p>基于 HTML、CSS 与 JavaScript 开发导航管理页面，实现导航项增删改查及 DOM 事件交互。</p>
          </div>
        </div>
      </section>

      <!-- 教育背景 -->
      <section class="education">
        <h3>教育背景</h3>
        <div class="edu-item">
          <h4>天津农学院</h4>
          <p class="degree">动物科学与动物医学 | 本科</p>
          <p class="date">2015年9月 - 2019年6月</p>
        </div>
      </section>

    </article>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
  line-height: 1.65em;
}

.cv-view {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

header > h4 {
  font-weight: bold;
}

.cv-document {
  width: 100%;
  min-height: auto;
}

p {
  margin: 0.3em 0;
}

h1 {
  font-size: 28px;
  margin-top: 0;
  margin-bottom: 4px;
  color: var(--text);
}

h2 {
  font-size: 22px;
  margin: 1em 0 0.5em;
  color: var(--text);
  border-bottom: 2px solid var(--border);
  padding-bottom: 6px;
}

h3 {
  font-size: 18px;
  margin: 0.8em 0 0.4em;
  color: var(--text);
  border-left: 4px solid var(--primary);
  padding-left: 8px;
}

h4,
h5,
h6 {
  margin: 0 0 6px;
  font-weight: bold;
}

ol,
ul {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
}

a {
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: 1px solid;
  transition: color 0.2s;
}
a:hover {
  color: var(--primary);
}

p,
li {
  color: var(--text);
  font-size: 14px;
}

strong {
  font-weight: bold;
}

/* 基本信息 */
.bio {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  align-items: start;
  gap: var(--spacing-md);
  margin-bottom: 0.8em;
  padding-bottom: 0.8em;
  border-bottom: 1px solid var(--border);
}

.bio .left,
.bio .right {
  min-width: 0;
}

.bio .right {
  text-align: right;
}

.bio .left h1 {
  margin-bottom: 4px;
}

.bio p {
  margin: 4px 0;
  font-size: 14px;
}

/* 专业技能 */
.skills strong {color:var(--primary)}
.skills {
  margin-bottom: 0.8em;
}

.skills .categories {
  margin-top: 0.6em;
}

.skills .category {
  margin-bottom: 0.8em;
}

.skills .category h4 {
  margin-top: 0;
  margin-bottom: 4px;
  color: var(--text-secondary);
  font-size: 15px;
}

.skills .category ul {
  margin: 0;
}

.skills .category li {
  margin-bottom: 2px;
  padding-left: 12px;
  position: relative;
}

.skills .category li:before {
  content: "•";
  color: var(--primary);
  position: absolute;
  left: 0;
}

/* 企业级项目 */
.experience {
  margin-bottom: 1.2em;
}

.experience .project {
  margin-bottom: 1.4em;
  padding-bottom: 1em;
  border-bottom: 1px dashed var(--border);
}

.experience .project:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.experience .project header {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  align-items: baseline;
  gap: var(--spacing-xs) var(--spacing-md);
  margin-bottom: 6px;
}

.experience .project header h4 {
  margin: 0;
  font-size: 16px;
}

.experience .project header .date {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: normal;
}

.experience .project header .company {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  text-align: right;
  font-style: italic;
}

.experience .project .description p {
  margin-bottom: 4px;
}

.experience .project .description ul {
  margin-left: 1em;
  margin-bottom: 6px;
}

.experience .project .description li {
  list-style-type: disc;
  margin-bottom: 3px;
  padding-left: 4px;
}

/* 个人项目 */
.personal-projects {
  margin-bottom: 1.2em;
}

.personal-projects .projects {
  margin-top: 0.6em;
}

.personal-projects .project-item {
  margin-bottom: 0.8em;
  padding-bottom: 0.8em;
  border-bottom: 1px dashed var(--border);
}

.personal-projects .project-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.personal-projects .project-item header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.personal-projects .project-item h4 {
  margin: 0;
  font-size: 15px;
}

.personal-projects .project-item .date {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: normal;
}

.personal-projects .project-item a {
  display: none;
}

.personal-projects .project-item p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.personal-projects .project-item p + p {margin-top:4px}
.personal-projects .project-item .stack {color:var(--text);font-weight:500}

/* 教育背景 */
.education {
  margin-bottom: 1.2em;
}

.education .edu-item {
  padding: 0.4em 0;
}

.education h4 {
  margin-bottom: 2px;
  font-size: 15px;
}

.education .degree {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.education .date {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.education .note {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}

@media (max-width: 500px) {
  .bio .right p {
    font-size: 12px;
  }
}

@media print {
  a {
    display: none;
  }

  br {
    display: none;
  }

  .cv-view {
    background: var(--bg);
    margin: 0;
  }

  .cv-document {
    width: 100%;
    min-height: auto;
    padding: 1cm 1.2cm;
    box-shadow: none;
  }

  .experience {
    break-before: page;
  }

  .experience .project,
  .personal-projects .project-item {
    break-inside: avoid;
  }
}

.cv-document {
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .experience .project header {
    grid-template-columns: minmax(0, 1fr);
  }

  .experience .project header .company {
    text-align: left;
  }
}

@media (max-width: 500px) {
  .personal-projects .project-item header {
    flex-wrap: wrap;
    gap: var(--spacing-xs) var(--spacing-sm);
  }

}

@media print {
  .cv-view {
    padding: 0;
    --bg: white;
    --text: #333;
    --text-secondary: #555;
    --border: #eee;
    --primary: royalblue;
  }
}
</style>
