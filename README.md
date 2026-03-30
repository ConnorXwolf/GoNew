# GoMemo (圍棋記憶力訓練)

這是一個專為圍棋愛好者設計的網頁應用程式，旨在幫助玩家提升對棋盤形狀的記憶力與直覺。透過短時間的記憶訓練，玩家可以更快速地掌握棋形，進而在實戰中提升計算與判斷能力。

## ✨ 核心功能 (Key Features)

### 繁體中文 (Traditional Chinese)
*   **🧠 圍棋記憶訓練**：專為提升圍棋棋感與記憶力設計的互動平台。
*   **📐 多種棋盤規格**：支援 9路、13路及 19路棋盤，滿足不同階段的練習需求。
*   **📊 精細難度分級**：從「幼幼班」（10-15手）到「極限」（200手或全譜），適合各階段棋友。
*   **🔄 間隔重複系統 (SRS)**：採用 SM-2 演算法，自動安排複習時間，強化長期記憶。
*   **🎲 隨機出題機制**：同難度與規格下隨機顯示題目，避免死記硬背，提升訓練效果。
*   **🎨 直觀互動介面**：支援落子、偷看解答、手順數字顯示及詳細解說。
*   **👁️ 視覺化反饋**：正確與錯誤落子皆有明確的虛線標示，並在棋子上顯示正確的手順。
*   **☁️ 數據同步與統計**：支援 Firebase (Firestore) 雲端同步與本地儲存，追蹤您的學習進度。
*   **🌐 多國語言支援**：提供繁體中文與英文介面切換。
*   **📚 豐富題庫**：內建超過 500 個精選 SGF 棋譜題目，持續更新中。

### English
*   **🧠 Go Memory Training**: An interactive platform designed to improve Go (Weiqi) intuition and memory.
*   **📐 Multiple Board Sizes**: Supports 9x9, 13x13, and 19x19 boards for versatile practice.
*   **📊 Granular Difficulty Levels**: Ranges from "Toddler" (10-15 moves) to "Extreme" (200 moves or full game).
*   **🔄 Spaced Repetition System (SRS)**: Utilizes the SM-2 algorithm to schedule reviews at optimal intervals for long-term retention.
*   **🎲 Randomized Problem Selection**: Problems are shuffled within categories to prevent rote memorization and enhance training.
*   **🎨 Intuitive Interface**: Features stone placement, peeking at solutions, move number displays, and detailed explanations.
*   **👁️ Visual Feedback**: Clear dashed outlines (green for correct, red for incorrect) with move numbers displayed on stones.
*   **☁️ Data Sync & Stats**: Supports Firebase (Firestore) cloud sync and local storage to track your learning progress.
*   **🌐 Multilingual Support**: Available in both Traditional Chinese and English.
*   **📚 Extensive Problem Library**: Includes over 500 curated problems imported from SGF files.

## 🎮 遊玩方式 (How to Play)

1.  **選擇難度與棋盤**：在首頁選擇適合您的難度區間與棋盤大小（9路/13路/19路）。
2.  **記憶盤面**：系統會顯示一段棋譜，請在限時內記住所有棋子的位置與順序。
3.  **還原棋盤**：進入作答模式後，憑記憶在棋盤上放置正確顏色的棋子。
4.  **提交答案**：完成後點擊「檢查答案」。系統會核對您的佈局。
5.  **檢討學習**：查看正確的手順與虛線反饋，並利用 SRS 系統在最佳時間點再次複習。

## 🛠️ 技術棧 (Tech Stack)

*   **前端框架**: React 18
*   **程式語言**: TypeScript
*   **樣式框架**: Tailwind CSS
*   **建置工具**: Vite
*   **後端服務**: Firebase (Auth & Firestore)
*   **動畫庫**: Framer Motion
*   **圖示庫**: Lucide React

## 🚀 本地開發 (Local Development)

1. 安裝依賴套件：
   ```bash
   npm install
   ```

2. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

3. 匯入 SGF 題目：
   ```bash
   npx tsx src/lib/importProblems.ts
   ```

## 📁 專案結構 (Project Structure)

*   `/src/components/`: 包含 UI 元件（如 `GoBoard` 棋盤元件）。
*   `/src/lib/`: 包含遊戲核心邏輯、SRS 演算法與 SGF 解析器。
*   `/src/lib/problems.json`: 匯入後的完整題庫資料。
*   `/src/App.tsx`: 應用程式的主要視圖與狀態管理。
*   `/src/index.css`: 全域樣式與 Tailwind CSS 引入。

---
*開始您的圍棋記憶訓練，成為下一個手筋達人吧！*
