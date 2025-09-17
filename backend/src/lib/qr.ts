import * as crypto from 'crypto'

export interface QRCodeData {
  tableCode: string
  timestamp: number
  signature: string
}

export function generateQRSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generateQRCodeData(tableCode: string, secret: string): QRCodeData {
  const timestamp = Date.now()
  const payload = `${tableCode}:${timestamp}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return {
    tableCode,
    timestamp,
    signature
  }
}

export function verifyQRCodeData(data: QRCodeData, secret: string, maxAge: number = 300000): boolean {
  const { tableCode, timestamp, signature } = data
  
  // Check if QR code has expired (default 5 minutes)
  if (Date.now() - timestamp > maxAge) {
    return false
  }

  // Verify signature
  const payload = `${tableCode}:${timestamp}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return signature === expectedSignature
}

export function generateCheckinUrl(baseUrl: string, qrData: QRCodeData): string {
  const params = new URLSearchParams({
    t: qrData.tableCode,
    ts: qrData.timestamp.toString(),
    sig: qrData.signature
  })

  return `${baseUrl}/checkin?${params.toString()}`
}

export function parseCheckinUrl(url: string): QRCodeData | null {
  try {
    const urlObj = new URL(url)
    const params = urlObj.searchParams
    
    const tableCode = params.get('t')
    const timestamp = params.get('ts')
    const signature = params.get('sig')

    if (!tableCode || !timestamp || !signature) {
      return null
    }

    return {
      tableCode,
      timestamp: parseInt(timestamp, 10),
      signature
    }
  } catch (error) {
    return null
  }
}

export function generateTableQRCode(tableCode: string, secret: string, baseUrl: string): {
  qrData: QRCodeData
  checkinUrl: string
} {
  const qrData = generateQRCodeData(tableCode, secret)
  const checkinUrl = generateCheckinUrl(baseUrl, qrData)
  
  return {
    qrData,
    checkinUrl
  }
}

// Generate table codes according to design: TABLE-01 to TABLE-50
export function generateTableCode(tableNumber: number): string {
  return `TABLE-${tableNumber.toString().padStart(2, '0')}`
}

export function parseTableCode(tableCode: string): number | null {
  const match = tableCode.match(/^TABLE-(\d{2})$/)
  if (!match) return null
  
  const tableNumber = parseInt(match[1], 10)
  if (tableNumber < 1 || tableNumber > 50) return null
  
  return tableNumber
}

export function isValidTableCode(tableCode: string): boolean {
  return parseTableCode(tableCode) !== null
}