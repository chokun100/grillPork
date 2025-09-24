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

export function validatePayRequest(data: any): ValidationResult {
  const errors: ValidationError[] = []

  if (data.amount === undefined || data.amount === null) {
    errors.push({ field: 'amount', message: 'Amount is required' })
  } else if (typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' })
  }

  if (data.method && !['CASH', 'PROMPTPAY'].includes(data.method)) {
    errors.push({ field: 'method', message: 'Method must be CASH or PROMPTPAY' })
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

  // Optional validation for PATCH - only validate provided fields
  if (data.adultPriceGross !== undefined) {
    if (data.adultPriceGross === null) {
      errors.push({ field: 'adultPriceGross', message: 'Adult price cannot be null' })
    } else if (typeof data.adultPriceGross !== 'number' || data.adultPriceGross <= 0) {
      errors.push({ field: 'adultPriceGross', message: 'Adult price must be positive number' })
    }
  }

  if (data.vatRate !== undefined) {
    if (data.vatRate === null) {
      // Allow null for vatRate if explicitly set
    } else {
      const vatRateNum = typeof data.vatRate === 'string' ? parseFloat(data.vatRate) : data.vatRate;
      if (isNaN(vatRateNum) || vatRateNum < 0 || vatRateNum > 1) {
        errors.push({ field: 'vatRate', message: 'VAT rate must be between 0 and 1' })
      }
    }
  }

  if (data.promptPayTarget !== undefined) {
    if (data.promptPayTarget === null || data.promptPayTarget === '') {
      // Allow null or empty to clear the field
    } else if (typeof data.promptPayTarget !== 'string' || data.promptPayTarget.trim() === '') {
      errors.push({ field: 'promptPayTarget', message: 'promptPayTarget must be a valid string' })
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