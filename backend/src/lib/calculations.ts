import { Decimal } from '@prisma/client/runtime/library'

export interface PricingInput {
  adultCount: number
  childCount: number
  adultPriceGross: Decimal
  vatRate: Decimal
  discountType?: 'NONE' | 'PERCENT' | 'AMOUNT'
  discountValue?: Decimal
  promotionDiscount?: Decimal
  loyaltyFreeApplied?: boolean
}

export interface PricingResult {
  baseGross: Decimal
  promoGrossDiscount: Decimal
  afterPromoGross: Decimal
  loyaltyFree: Decimal
  discountedGross: Decimal
  subtotalGross: Decimal
  vatAmount: Decimal
  totalGross: Decimal
  adultPayingCount: number
}

export function calculateBillPricing(input: PricingInput): PricingResult {
  const {
    adultCount,
    childCount,
    adultPriceGross,
    vatRate,
    discountType = 'NONE',
    discountValue = new Decimal(0),
    promotionDiscount = new Decimal(0),
    loyaltyFreeApplied = false
  } = input

  // Children are free, so only adults pay
  const adultPayingCount = adultCount
  const baseGross = new Decimal(adultPayingCount).mul(adultPriceGross)

  // Apply promotion discount (e.g., weekend 10% off)
  const promoGrossDiscount = promotionDiscount
  const afterPromoGross = baseGross.sub(promoGrossDiscount)

  // Apply loyalty free (1 adult free after 10 stamps)
  const loyaltyFree = loyaltyFreeApplied ? adultPriceGross : new Decimal(0)
  const afterLoyaltyGross = afterPromoGross.sub(loyaltyFree)

  // Apply manual discount if provided
  let discountedGross = afterLoyaltyGross
  if (discountType === 'PERCENT') {
    discountedGross = afterLoyaltyGross.mul(new Decimal(1).sub(discountValue.div(100)))
  } else if (discountType === 'AMOUNT') {
    discountedGross = afterLoyaltyGross.sub(discountValue)
  }

  // Ensure no negative totals
  const subtotalGross = Decimal.max(discountedGross, new Decimal(0))

  // Calculate VAT (VAT is included in the price)
  // net = gross / (1 + VAT); VAT_amount = gross - net
  const vatAmount = subtotalGross.sub(subtotalGross.div(new Decimal(1).add(vatRate)))
  const totalGross = subtotalGross

  return {
    baseGross,
    promoGrossDiscount,
    afterPromoGross,
    loyaltyFree,
    discountedGross,
    subtotalGross,
    vatAmount,
    totalGross,
    adultPayingCount
  }
}

export function calculateWeekendPromotion(
  baseGross: Decimal,
  daysOfWeek: string[],
  currentDay: string
): { discount: Decimal; applied: boolean } {
  const weekendDays = ['SAT', 'SUN']
  const isWeekend = weekendDays.includes(currentDay)
  const isPromotionDay = daysOfWeek.includes(currentDay)

  if (isWeekend && isPromotionDay) {
    // 10% discount on weekends
    const discount = baseGross.mul(0.1)
    return { discount, applied: true }
  }

  return { discount: new Decimal(0), applied: false }
}

export function calculateLoyaltyRedemption(
  currentStamps: number,
  adultPriceGross: Decimal
): { canRedeem: boolean; freeAmount: Decimal; newStamps: number } {
  if (currentStamps >= 10) {
    return {
      canRedeem: true,
      freeAmount: adultPriceGross,
      newStamps: currentStamps - 10
    }
  }

  return {
    canRedeem: false,
    freeAmount: new Decimal(0),
    newStamps: currentStamps
  }
}

export function updateLoyaltyStamps(
  currentStamps: number,
  paidBills: number,
  loyaltyFreeApplied: boolean
): number {
  if (loyaltyFreeApplied) {
    // Don't add stamps if loyalty free was applied
    return currentStamps
  }

  // Add 1 stamp per paid bill
  return currentStamps + paidBills
}

export function formatCurrency(amount: Decimal, currency: string = 'THB'): string {
  return `${amount.toFixed(2)} ${currency}`
}

export function roundToNearestQuarter(amount: Decimal): Decimal {
  return amount.mul(4).round().div(4)
}

export function getCurrentDayOfWeek(): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  return days[new Date().getDay()]
}

export function validatePricingInput(input: any): string[] {
  const errors: string[] = []

  if (!input.adultCount || input.adultCount < 0) {
    errors.push('Adult count must be a positive number')
  }

  if (!input.childCount || input.childCount < 0) {
    errors.push('Child count must be a positive number')
  }

  if (!input.adultPriceGross || input.adultPriceGross <= 0) {
    errors.push('Adult price must be positive')
  }

  if (!input.vatRate || input.vatRate < 0) {
    errors.push('VAT rate must be positive')
  }

  if (input.discountType && !['NONE', 'PERCENT', 'AMOUNT'].includes(input.discountType)) {
    errors.push('Invalid discount type')
  }

  if (input.discountValue && input.discountValue < 0) {
    errors.push('Discount value must be positive')
  }

  return errors
}