/**
 * PDF Export Utility for Letter Sharing
 *
 * Generates a 3-page printable PDF containing:
 * 1. Share Link + QR Code (for recipient)
 * 2. Unlock Code (for recipient, via separate channel)
 * 3. Backup Code (for sender only)
 */

export interface PdfExportParams {
  shareUrl: string;
  unlockCode: string;
  backupShare: string | null;
}

/**
 * Generates HTML content for the 3-page PDF
 */
export function generatePdfHtml(params: PdfExportParams): string {
  const { shareUrl, unlockCode, backupShare } = params;

  // QR Code via Google Charts API
  const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(shareUrl)}&choe=UTF-8`;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>未来便 - 共有情報</title>
    <style>
      @media print {
        .page { page-break-after: always; }
        .page:last-child { page-break-after: avoid; }
      }
      body { 
        font-family: "Shippori Mincho", "Noto Serif JP", serif; 
        margin: 0; 
        padding: 40px;
        color: #333;
      }
      .page { 
        min-height: 90vh;
        padding: 40px;
        box-sizing: border-box;
      }
      .header {
        text-align: center;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 2px solid #e67e22;
      }
      .header h1 {
        color: #e67e22;
        font-size: 28px;
        margin: 0 0 10px 0;
      }
      .header .subtitle {
        color: #666;
        font-size: 14px;
      }
      .content {
        text-align: center;
        margin: 40px 0;
      }
      .qr-code {
        margin: 30px auto;
      }
      .code-box {
        font-family: monospace;
        font-size: 24px;
        letter-spacing: 4px;
        padding: 20px 30px;
        background: #f8f8f8;
        border: 2px solid #ddd;
        border-radius: 8px;
        display: inline-block;
        margin: 20px 0;
      }
      .url-box {
        font-family: monospace;
        font-size: 12px;
        padding: 15px;
        background: #f8f8f8;
        border: 1px solid #ddd;
        border-radius: 4px;
        word-break: break-all;
        text-align: left;
        margin: 20px auto;
        max-width: 500px;
      }
      .warning {
        background: #fff3cd;
        border: 1px solid #ffc107;
        color: #856404;
        padding: 15px 20px;
        border-radius: 8px;
        margin: 30px auto;
        max-width: 500px;
      }
      .warning-danger {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
      }
      .instruction {
        background: #e8f4fd;
        border: 1px solid #bee5eb;
        color: #0c5460;
        padding: 15px 20px;
        border-radius: 8px;
        margin: 20px auto;
        max-width: 500px;
        text-align: left;
      }
      .page-label {
        position: absolute;
        bottom: 20px;
        right: 40px;
        color: #999;
        font-size: 12px;
      }
      .backup-warning {
        background: #343a40;
        color: #fff;
        padding: 20px;
        border-radius: 8px;
        margin: 20px auto;
        max-width: 500px;
      }
    </style>
  </head>
  <body>
    <!-- ページ1: 共有リンク -->
    <div class="page">
      <div class="header">
        <h1>未来便 - 共有リンク</h1>
        <div class="subtitle">このページを受取人に渡してください</div>
      </div>
      <div class="content">
        <p>以下のQRコードまたはURLから手紙を開けます</p>
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="QRコード" width="200" height="200" />
        </div>
        <div class="url-box">${shareUrl}</div>
      </div>
      <div class="warning">
        <strong>重要:</strong> 解錠コードはこのページには記載されていません。<br>
        解錠コードは別の経路（別のメッセージ、別の紙）で伝えてください。
      </div>
    </div>

    <!-- ページ2: 解錠コード -->
    <div class="page">
      <div class="header">
        <h1>未来便 - 解錠コード</h1>
        <div class="subtitle">このページを受取人に渡してください（共有リンクとは別経路で）</div>
      </div>
      <div class="content">
        <p>手紙を開封するためのコードです</p>
        <div class="code-box">${unlockCode}</div>
      </div>
      <div class="instruction">
        <strong>使い方:</strong><br>
        1. 共有リンクから手紙のページを開く<br>
        2. 「解錠コードを入力」欄に上記のコードを入力<br>
        3. 「開封する」ボタンを押す
      </div>
      <div class="warning warning-danger">
        <strong>警告:</strong> このコードを紛失すると、手紙を開封できなくなります。<br>
        安全な場所に保管してください。
      </div>
    </div>

    <!-- ページ3: バックアップコード -->
    <div class="page">
      <div class="header">
        <h1>未来便 - バックアップコード</h1>
        <div class="subtitle">【送信者保管用】受取人には渡さないでください</div>
      </div>
      <div class="content">
        <p>緊急時の復旧用コードです</p>
        <div class="code-box" style="font-size: 14px; letter-spacing: 2px;">${backupShare || '未生成'}</div>
      </div>
      <div class="backup-warning">
        <strong>重要な注意事項:</strong><br><br>
        • このコードは解錠コードを紛失した場合の緊急復旧用です<br>
        • 受取人には絶対に渡さないでください<br>
        • 金庫やセキュリティボックスなど安全な場所に保管してください<br>
        • このコードが漏洩すると、第三者が手紙を開封できる可能性があります
      </div>
    </div>
  </body>
</html>
  `.trim();
}

/**
 * Opens print dialog with the generated PDF content
 * @returns true if print window opened successfully
 */
export function openPrintDialog(params: PdfExportParams): boolean {
  const html = generatePdfHtml(params);

  const printWindow = window.open('', '', 'width=800,height=600');
  if (!printWindow) {
    return false;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for QR image to load before printing
  setTimeout(() => {
    printWindow.print();
  }, 500);

  return true;
}
