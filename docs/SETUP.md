# DUMC 网站与邮箱上线指南

网站是纯静态页面（`index.html`），由 GitHub Pages 托管，不需要服务器。
下面假设域名是 **dumc.com.au**。如果用别的域名，在 `index.html` 中把
`dumc.com.au` 全部替换即可（邮箱地址出现在联系区、页脚、表单脚本和 JSON-LD 里）。

---

## 1. 注册域名

- `.com.au` 需要 **ABN**（澳洲商业号码），用 ABN 在 VentraIP、Crazy Domains、GoDaddy AU 等注册商注册。
- 没有 ABN 的话可以先用 `.au`（澳洲公民/居民即可注册）或 `.com`。
- 建议把 DNS 托管到 **Cloudflare**（免费），后面的记录都在 Cloudflare 里添加。

## 2. 网站：GitHub Pages + 自定义域名

1. 把本分支合并到 `main`。
2. 仓库 **Settings → Pages**：Source 选 `Deploy from a branch`，分支 `main`，目录 `/ (root)`。
3. 在 **Custom domain** 填 `dumc.com.au` 并保存（GitHub 会自动在仓库里生成 `CNAME` 文件），DNS 生效后勾选 **Enforce HTTPS**。
4. DNS 添加：

| 类型  | 名称 | 值 |
|-------|------|----|
| A     | @    | 185.199.108.153 |
| A     | @    | 185.199.109.153 |
| A     | @    | 185.199.110.153 |
| A     | @    | 185.199.111.153 |
| CNAME | www  | psduxx.github.io |

> Cloudflare 里这几条记录请设为 **DNS only（灰色云）**，否则 GitHub 无法签发 HTTPS 证书。

原来的番茄识别器已移到 `/tomato/`，网站页面上作为 “lab demo” 链接展示。
根目录的 `service-worker.js` 现在是一个“自毁”版本：以前装过番茄 PWA 的浏览器会自动清缓存，看到新网站。

## 3. 企业邮箱

网站上用到两个地址：

- `hello@dumc.com.au`：对外主邮箱（询价、联系表单）
- `support@dumc.com.au`：技术支持（可以只是 hello 的别名，不必单独付费）

### 方案 A（推荐，专业）：Google Workspace

- Business Starter，约 A$10+/用户/月（以官网报价为准），Gmail 界面，可以用自己域名收发。
- 只需开 **1 个用户**（如 `tony@dumc.com.au`），把 `hello@`、`support@` 设为该用户的**别名**，不额外收费。
- DNS 记录：

| 类型 | 名称 | 值 |
|------|------|----|
| MX   | @    | `smtp.google.com`（优先级 1） |
| TXT  | @    | `v=spf1 include:_spf.google.com ~all` |
| TXT  | `google._domainkey` | 在 Admin 控制台 → Apps → Gmail → Authenticate email 生成后粘贴 |
| TXT  | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@dumc.com.au` |

### 方案 B（免费起步）：Zoho Mail（澳洲数据中心）

- 在 **zoho.com.au** 注册（数据存放在澳洲），Forever Free 计划可绑 1 个域名、最多 5 个用户，网页版/手机 App 收发。
- DNS 记录（澳洲数据中心）：

| 类型 | 名称 | 值 |
|------|------|----|
| MX   | @    | `mx.zoho.com.au`（10） |
| MX   | @    | `mx2.zoho.com.au`（20） |
| MX   | @    | `mx3.zoho.com.au`（50） |
| TXT  | @    | `v=spf1 include:zoho.com.au ~all` |
| TXT  | `zmail._domainkey` | 在 Zoho 控制台生成的 DKIM 值 |
| TXT  | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@dumc.com.au` |

> 具体 MX/SPF 值以 Zoho 控制台“域名验证”页面显示的为准。

### 方案 C（只收不发，零成本）：Cloudflare Email Routing

把 `hello@` / `support@` 转发到个人 Gmail。缺点：回信会显示个人 Gmail 地址，不够专业，只适合过渡期。

### 上线后检查

- 从外部邮箱给 `hello@dumc.com.au` 发信，确认能收到。
- 从企业邮箱发信到 Gmail，打开“显示原始邮件”，确认 SPF / DKIM / DMARC 都是 **PASS**。
- 运行 2–4 周没有问题后，把 DMARC 从 `p=none` 改成 `p=quarantine`，防止别人冒用你的域名发信。

## 4. 上线前待办

- [ ] 确认三个项目（Dozer / SSID / Rain model）的描述准确，修改 `index.html` 里 “Recent work” 部分
- [ ] 拿到 ABN 后，取消页脚 `<!-- ABN -->` 注释并填上
- [ ] 如果有固定报价（如支持计划月费），填进 “Buy & pricing” 部分
- [ ] 联系表单目前是打开访客的邮件 App；如果想要网页直接提交，可以接 Formspree 或 Web3Forms（免费额度足够起步）
