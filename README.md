# 🚀 如何發布與佈署此專案
這個專案是一個**單頁式網頁應用程式 (Single Page Application)**，完全由前端 HTML/JS 組成。這意味著您可以非常輕鬆地將其免費佈署到網路上。
以下是三種最簡單的免費佈署方式：
---
## 方法一：Netlify Drop (最簡單、最快)
**適合：** 不想使用 Git 或指令，只需拖拉檔案即可上線。
1. 準備檔案：確保您的 `index.html` 檔案已儲存在電腦的一個資料夾中（例如命名為 `bus-tracker`）。
2. 前往 [Netlify Drop](https://app.netlify.com/drop)。
3. 將您的資料夾 **拖曳** 到網頁上的虛線區域中。
4. 等待幾秒鐘，Netlify 會自動產生一個網址（例如 `https://agitated-curie-xxxx.netlify.app`）。
5. **完成！** 您的網站已經上線。
---
## 方法二：GitHub Pages (開發者推薦)
**適合：** 如果您已經有 GitHub 帳號，且希望持續維護程式碼。
1. 在 [GitHub](https://github.com) 上建立一個新的 Repository（例如 `red5-bus-tracker`）。
2. 將 `index.html` 上傳到該 Repository。
3. 進入 Repository 的 **Settings (設定)** > **Pages**。
4. 在 **Build and deployment** 下的 **Branch** 選擇 `main` (或 master) 並點擊 **Save**。
5. 等待約 1-2 分鐘，重新整理頁面，上方會出現您的網站網址（例如 `https://yourname.github.io/red5-bus-tracker/`）。
---
## 方法三：Vercel
**適合：** 追求極致效能與全球 CDN 加速。
1. 前往 [Vercel](https://vercel.com) 並註冊/登入。
2. 點擊 **Add New...** > **Project**。
3. 連結您的 GitHub Repository (如果您用了方法二)。
4. 或者安裝 Vercel CLI (`npm i -g vercel`)，在專案資料夾輸入 `vercel` 指令即可發布。
---
## ⚠️ 重要注意事項：CORS 代理
本專案依賴公開的 **CORS Proxy 服務** (如 `corsproxy.io`, `allorigins.win`) 來讀取政府的 API 資料，因為政府伺服器未開放直接的前端連線權限。
**在正式佈署環境中需注意：**
1. **穩定性**：公開 Proxy 有時會不穩定或限制流量。
2. **建議解法**：若您希望長期穩定營運，建議自行建立一個簡單的後端轉發服務 (例如使用 Cloudflare Workers 或 Vercel Functions)。
### 使用 Cloudflare Workers 建立私有 Proxy (進階)
如果您發現連線不穩，可以建立一個 `worker.js`：
```javascript
export default {
  async fetch(request) {
    const targetUrl = "https://pda5284.gov.taipei/MQS/SubRouteDyna?csvsubrouteid=10821";
    const response = await fetch(targetUrl);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*"); // 允許所有來源
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
}
```
然後將網頁程式碼中的 `API_URL` 改為您 Worker 的網址即可。
