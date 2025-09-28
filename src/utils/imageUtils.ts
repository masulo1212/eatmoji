/**
 * 圖片處理工具函數
 */

/**
 * 將 ArrayBuffer 轉換為 Base64
 * @param buffer ArrayBuffer
 * @returns Base64 字符串
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 1024;
  
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

/**
 * 根據文件頭部字節判斷圖片 MIME 類型
 * @param buffer ArrayBuffer
 * @returns MIME 類型字符串
 */
export function getImageMimeType(buffer: ArrayBuffer): string {
  const arr = new Uint8Array(buffer);
  
  if (arr.length < 12) return "image/jpeg";
  
  // JPEG
  if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) {
    return "image/jpeg";
  }
  
  // PNG
  if (
    arr[0] === 0x89 &&
    arr[1] === 0x50 &&
    arr[2] === 0x4e &&
    arr[3] === 0x47 &&
    arr[4] === 0x0d &&
    arr[5] === 0x0a &&
    arr[6] === 0x1a &&
    arr[7] === 0x0a
  ) {
    return "image/png";
  }
  
  // GIF
  if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38) {
    return "image/gif";
  }
  
  // WebP
  if (
    arr[0] === 0x52 &&
    arr[1] === 0x49 &&
    arr[2] === 0x46 &&
    arr[3] === 0x46 &&
    arr[8] === 0x57 &&
    arr[9] === 0x45 &&
    arr[10] === 0x42 &&
    arr[11] === 0x50
  ) {
    return "image/webp";
  }
  
  // 預設為 JPEG
  return "image/jpeg";
}

/**
 * 驗證圖片文件大小
 * @param file File 對象
 * @param maxSizeInMB 最大文件大小（MB）
 * @returns 是否通過驗證
 */
export function validateImageSize(file: File, maxSizeInMB: number = 10): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * 驗證圖片文件類型
 * @param file File 對象
 * @returns 是否為支持的圖片類型
 */
export function validateImageType(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return allowedTypes.includes(file.type);
}

/**
 * 驗證圖片文件（綜合驗證）
 * @param imageFiles 圖片文件數組
 * @returns 驗證結果
 */
export function validateImageFiles(imageFiles: File[]): { isValid: boolean; error?: string } {
  if (!imageFiles || imageFiles.length === 0) {
    return {
      isValid: false,
      error: "沒有上傳圖片",
    };
  }

  // 檢查文件大小和類型
  for (const file of imageFiles) {
    if (!validateImageSize(file, 10)) {
      return {
        isValid: false,
        error: "圖片文件過大，請上傳小於 10MB 的圖片",
      };
    }

    if (!validateImageType(file)) {
      return {
        isValid: false,
        error: "請上傳有效的圖片文件（支援 JPEG、PNG、GIF、WebP）",
      };
    }
  }

  return { isValid: true };
}