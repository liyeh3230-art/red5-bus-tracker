/**
 * 🚌 紅5公車 雲端追蹤機器人 (Google Apps Script)
 * 
 * 功能：
 * 1. 24小時不間斷執行 (需設定觸發條件)
 * 2. 自動抓取 pda5284 API
 * 3. 追蹤車輛進出站並計算時間
 * 4. 將結果存入 Google Sheet
 * 
 * 使用方式：
 * 1. 建立一個新的 Google Sheet
 * 2. 點選「擴充功能」>「Apps Script」
 * 3. 將此程式碼貼上並儲存
 * 4. 設定觸發條件 (每分鐘執行一次 main 函式)
 */

// ===== 設定區 =====
const CONFIG = {
  // 紅5 (或目標路線) API 網址
  API_URL: 'https://pda5284.gov.taipei/MQS/SubRouteDyna?csvsubrouteid=10821',
  
  // 站點 ID 設定
  START_STOP_ID: '11073',  // 文化大學
  END_STOP_ID: '11121',    // 捷運劍潭站
  
  // 試算表分頁名稱
  SHEET_NAME: '行駛記錄'
};

// ===== 主程式 (請設定觸發條件執行此函式) =====
function main() {
  const sheet = setupSheet();
  const data = fetchBusData();
  
  if (!data) return;
  
  // 讀取暫存的追蹤中車輛 (從 Script Properties)
  const scriptProps = PropertiesService.getScriptProperties();
  let trackingBuses = JSON.parse(scriptProps.getProperty('TRACKING_BUSES') || '{}');
  let isDirty = false; // 標記是否有資料變更
  
  const now = new Date();
  const nowTime = now.getTime();
  
  // 解析 API 資料
  const currentBuses = parseApiData(data);
  
  // 核心追蹤邏輯
  currentBuses.forEach(bus => {
    const busNum = bus.num;
    
    // 1. 發現車輛在起點，且尚未追蹤 -> 開始追蹤
    if (bus.stopId == CONFIG.START_STOP_ID && !trackingBuses[busNum]) {
      trackingBuses[busNum] = {
        startWait: nowTime, // 暫存時間，等待離開起點才確認
        status: 'WAITING_DEPARTURE'
      };
      isDirty = true;
      console.log(`[發現] ${busNum} 在起點`);
    }
    
    // 2. 處理追蹤中的車輛
    if (trackingBuses[busNum]) {
      const tracker = trackingBuses[busNum];
      
      // 確認車輛正式出發 (狀態變更為行駛中)
      if (tracker.status === 'WAITING_DEPARTURE' && bus.stopId != CONFIG.START_STOP_ID) {
        tracker.status = 'ON_ROAD';
        tracker.startTime = nowTime; // 以偵測到離開的時間為準
        tracker.startStop = CONFIG.START_STOP_ID;
        isDirty = true;
        console.log(`[出發] ${busNum} 已離開起點，開始計時`);
      }
      
      // 更新最後目擊時間
      tracker.lastSeen = nowTime;
      
      // 3. 抵達終點 -> 結算
      if (bus.stopId == CONFIG.END_STOP_ID) {
        if (tracker.startTime) { // 確保有正確的開始時間
          const durationMs = nowTime - tracker.startTime;
          const durationMin = (durationMs / 60000).toFixed(1);
          
          // 過濾異常資料 (例如小於 5 分鐘或大於 90 分鐘)
          if (durationMin > 5 && durationMin < 90) {
            // 寫入試算表
            sheet.appendRow([
              busNum,
              formatDate(new Date(tracker.startTime)),
              formatDate(now),
              durationMin,
              new Date().toLocaleDateString()
            ]);
            console.log(`[完成] ${busNum} 耗時 ${durationMin} 分`);
          }
        }
        // 移除追蹤
        delete trackingBuses[busNum];
        isDirty = true;
      }
    }
  });
  
  // 清理過期資料 (超過 2 小時未更新的幽靈車)
  Object.keys(trackingBuses).forEach(key => {
    if (nowTime - trackingBuses[key].lastSeen > 7200000) {
      delete trackingBuses[key];
      isDirty = true;
    }
  });
  
  // 儲存追蹤狀態
  if (isDirty) {
    scriptProps.setProperty('TRACKING_BUSES', JSON.stringify(trackingBuses));
  }
}

// ===== 輔助函式 =====

// 初始化試算表
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    // 建立標題列
    sheet.appendRow(['車號', '起點時間', '終點時間', '耗時(分)', '日期']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#f3f4f6');
  }
  return sheet;
}

// 抓取 API
function fetchBusData() {
  try {
    const options = {
      'method': 'get',
      'headers': { 'Accept': 'application/json' },
      'muteHttpExceptions': true
    };
    const response = UrlFetchApp.fetch(CONFIG.API_URL, options);
    if (response.getResponseCode() !== 200) return null;
    
    const json = JSON.parse(response.getContentText());
    return json;
  } catch (e) {
    console.error('Fetch Error:', e);
    return null;
  }
}

// 解析特定格式的 JSON
function parseApiData(data) {
  const buses = [];
  if (data && data.SubRoute) {
    data.SubRoute.forEach(sub => {
      if (sub.Bus) {
        sub.Bus.forEach(bus => {
          if (bus.a2) {
            // a2 格式範例: A2,RouteID,UniqueId,Type,Progress,SubRouteId,?,StopId,Status,...
            const parts = bus.a2.split(',');
            if (parts.length > 8) {
              buses.push({
                num: bus.num,
                stopId: parts[7], // StopId
                timestamp: new Date().getTime()
              });
            }
          }
        });
      }
    });
  }
  return buses;
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'HH:mm:ss');
}
