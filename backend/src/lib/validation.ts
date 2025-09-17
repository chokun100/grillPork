import { Decimal } from '@prisma/client/runtime/library'

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  // Thai phone number validation: 10 digits, starts with 0
  const phoneRegex = /^0[0-9]{9}$/
  return phoneRegex.test(phone)
}

export function validateTableCode(code: string): boolean {
  // TABLE-01 to TABLE-50 format
  const tableCodeRegex = /^TABLE-(0[1-9]|[1-4][0-9]|50)$/
  return tableCodeRegex.test(code)
}

export function validateScopes(scopes: string[]): ValidationResult {
  const errors: ValidationError[] = []
  const validScopes = [
    'admin:*', 'admin:read',
    'cashier:*', 'cashier:read',
    'read-only:read'
  ]

  for (let i = 0; i < scopes.length; i++) {
    const scope = scopes[i]
    if (!validScopes.includes(scope)) {
      errors.push({
        field: `scopes[${i}]`,
        message: `Invalid scope. Valid scopes are: ${validScopes.join(', ')}`
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateRole(role: string): boolean {
  return ['ADMIN', 'CASHIER', 'READ_ONLY'].includes(role)
}

export function validateOpenBillRequest(data: any): ValidationResult {
  const errors: ValidationError[] = []

  if (data.adultCount === undefined || data.adultCount === null) {
    errors.push({ field: 'adultCount', message: 'Adult count is required' })
  } else if (!Number.isInteger(data.adultCount) || data.adultCount < 0) {
    errors.push({ field: 'adultCount', message: 'Adult count must be a non-negative integer' })
  }

  if (data.childCount === undefined || data.childCount === null) {
    errors.push({ field: 'childCount', message: 'Child count is required' })
  } else if (!Number.isInteger(data.childCount) || data.childCount < 0) {
    errors.push({ field: 'childCount', message: 'Child count must be a non-negative integer' })
  }

  if (data.customerPhone !== undefined && data.customerPhone !== null) {
    if (!validatePhone(data.customerPhone)) {
      errors.push({ field: 'customerPhone', message: 'Invalid phone number format' })
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validatePayCashRequest(data: any): ValidationResult {
  const errors: ValidationError[] = []

  if (data.amount === undefined || data.amount === null) {
    errors.push({ field: 'amount', message: 'Amount is required' })
  } else if (typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' })
  }

  if (data.method !== 'CASH') {
    errors.push({ field: 'method', message: 'Only CASH payment method is supported' })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validatePromotion(data: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!data.key || typeof data.key !== 'string') {
    errors.push({ field: 'key', message: 'Promotion key is required' })
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push({ field: 'name', message: 'Promotion name is required' })
  }

  if (!data.type || !['PERCENT', 'AMOUNT'].includes(data.type)) {
    errors.push({ field: 'type', message: 'Promotion type must be PERCENT or AMOUNT' })
  }

  if (data.value === undefined || data.value === null) {
    errors.push({ field: 'value', message: 'Promotion value is required' })
  } else if (typeof data.value !== 'number' || data.value <= 0) {
    errors.push({ field: 'value', message: 'Promotion value must be positive' })
  }

  if (data.daysOfWeek && Array.isArray(data.daysOfWeek)) {
    const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    for (let i = 0; i < data.daysOfWeek.length; i++) {
      const day = data.daysOfWeek[i]
      if (!validDays.includes(day)) {
        errors.push({
          field: `daysOfWeek[${i}]`,
          message: `Invalid day. Valid days are: ${validDays.join(', ')}`
        })
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateTable(data: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!data.code || typeof data.code !== 'string') {
    errors.push({ field: 'code', message: 'Table code is required' })
  } else if (!validateTableCode(data.code)) {
    errors.push({ field: 'code', message: 'Table code must be in format TABLE-01 to TABLE-50' })
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push({ field: 'name', message: 'Table name is required' })
  }

  if (data.status && !['AVAILABLE', 'OCCUPIED', 'CLEANING'].includes(data.status)) {
    errors.push({ field: 'status', message: 'Invalid table status' })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateUser(data: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!data.name || typeof data.name !== 'string') {
    errors.push({ field: 'name', message: 'User name is required' })
  }

  if (!data.username || typeof data.username !== 'string') {
    errors.push({ field: 'username', message: 'Username is required' })
  } else if (data.username.length < 3) {
    errors.push({ field: 'username', message: 'Username must be at least 3 characters long' })
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' })
  } else if (data.password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters long' })
  }

  if (!data.role || !validateRole(data.role)) {
    errors.push({ field: 'role', message: 'Role must be ADMIN, CASHIER, or READ_ONLY' })
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' })
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.push({ field: 'phone', message: 'Invalid phone format' })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateLogin(data: any): ValidationResult {
  const errors: ValidationError[] = []

  if (!data.username || typeof data.username !== 'string') {
    errors.push({ field: 'username', message: 'Username is required' })
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateSettings(data: any): ValidationResult {
  const errors: ValidationError[] = []

  if (data.adultPriceGross === undefined || data.adultPriceGross === null) {
    errors.push({ field: 'adultPriceGross', message: 'Adult price is required' })
  } else if (typeof data.adultPriceGross !== 'number' || data.adultPriceGross <= 0) {
    errors.push({ field: 'adultPriceGross', message: 'Adult price must be positive' })
  }

  if (!data.currency || typeof data.currency !== 'string') {
    errors.push({ field: 'currency', message: 'Currency is required' })
  }

  if (data.vatRate !== undefined && data.vatRate !== null) {
    if (typeof data.vatRate !== 'number' || data.vatRate < 0 || data.vatRate > 1) {
      errors.push({ field: 'vatRate', message: 'VAT rate must be between 0 and 1' })
    }
  }

  if (data.locales && Array.isArray(data.locales)) {
    const validLocales = ['th', 'en']
    for (let i = 0; i < data.locales.length; i++) {
      const locale = data.locales[i]
      if (!validLocales.includes(locale)) {
        errors.push({
          field: `locales[${i}]`,
          message: `Invalid locale. Valid locales are: ${validLocales.join(', ')}`
        })
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function buildErrorResponse(errors: ValidationError[]) {
  return {
    ok: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors
    }
  }
}