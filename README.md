# 王國守衛者 — 翡翠森林

一款以 React、TypeScript、Phaser 3、Vite、Tailwind CSS 與 Zustand 打造的原創奇幻塔防網頁遊戲。遊戲畫面使用程式繪製的森林、城堡、角色與特效，音效由瀏覽器 Web Audio API 即時合成，不依賴未授權素材或後端服務。

## 環境需求

- Node.js 20.19+ 或 22.12+
- npm 10+

## 安裝與啟動

```bash
npm install
npm run dev
```

在終端機顯示的網址開啟遊戲（通常是 `http://localhost:5173`）。正式建置與本機預覽：

```bash
npm run build
npm run preview
```

## 遊戲操作

- 點擊「開始守衛王國」，再點擊地圖上的金色營地選擇防禦塔。
- 點擊已建造的防禦塔查看攻擊範圍、升級至 Lv.3，或出售並取回總花費的 60%。
- 點擊地圖空地移動英雄；英雄會自動攻擊附近敵人。
- 點擊「召喚第一波」或「提前召喚」部署敵軍。擊退一波後可選擇提早開始下一波。
- 使用 **Q** 選取流星火雨、**W** 選取召喚援軍，再點擊戰場指定位置；**Esc** 取消選取。
- 按 **Space** 或暫停按鈕暫停遊戲；速度按鈕切換 1× / 2×。
- 支援滑鼠、觸控與窄螢幕操作。音效可由右上角切換。

## 遊戲內容

- 20 波漸進式敵軍，包含哥布林、獸人、狼騎兵、裝甲騎士、飛行惡魔與最終 Boss。
- 遊俠箭塔、秘法高塔、矮人砲台與騎士兵營，各有不同攻擊方式。
- 初始生命 20、金幣 250；擊敗敵人取得金幣，保護城堡免於敵軍突破。
- 流星火雨與援軍召喚具有獨立冷卻時間。
- 最高抵禦波次與勝利紀錄儲存在瀏覽器 LocalStorage；不會上傳至伺服器。

## 上傳至 GitHub

先在 GitHub 建立一個空白 repository，然後在專案資料夾執行下列指令。將 `<你的帳號>` 與 `<repository 名稱>` 換成自己的資料：

```bash
git init
git add .
git commit -m "Build Kingdom Defender tower defense game"
git branch -M main
git remote add origin https://github.com/<你的帳號>/<repository 名稱>.git
git push -u origin main
```

若專案已設定 Git remote，略過 `git init` 和 `git remote add origin ...`，直接提交並推送即可：

```bash
git add .
git commit -m "Build Kingdom Defender tower defense game"
git push
```

## 部署到 Vercel

### 透過 Vercel 網站

1. 將專案推送至 GitHub。
2. 登入 [Vercel](https://vercel.com/)，選擇 **Add New → Project**，匯入該 GitHub repository。
3. 確認 **Framework Preset** 為 `Vite`、**Build Command** 為 `npm run build`、**Output Directory** 為 `dist`。
4. 此專案不需環境變數；按 **Deploy** 開始部署。
5. 後續推送到 GitHub 的新 commit 會自動觸發 Vercel 重新部署。

### 使用 Vercel CLI

```bash
npm install --global vercel
vercel
vercel --prod
```

首次執行時依照 CLI 提示登入並連結專案。部署設定已記錄在 `vercel.json`。
