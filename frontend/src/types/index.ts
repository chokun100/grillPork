import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export interface Bill {
  id: string;
  status: "OPEN" | "CLOSED" | "VOID";
  adultCount: number;
  childCount: number;
  adultPriceGross: number;
  discountType: "NONE" | "PERCENT" | "AMOUNT";
  discountValue: number;
  promoApplied?: string;
  loyaltyFreeApplied: boolean;
  subtotalGross: number;
  vatAmount: number;
  totalGross: number;
  paidAmount: number;
  paymentMethod?: "CASH" | "PROMPTPAY";
  notes?: string;
  openedAt: string;
  closedAt?: string;
  table: {
    code: string;
    name: string;
  };
  customer?: {
    id: string;
    name?: string;
    phone?: string;
    loyaltyStamps: number;
  };
  openedBy: {
    id: string;
    name: string;
    role: string;
  };
  closedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface Promotion {
  id: string;
  key: string;
  name: string;
  type: "PERCENT" | "AMOUNT";
  value: number;
  expiresAt?: string | null;
  conditions?: {
    minAdults?: number;
    payAdults?: number;
    // Add more condition types as needed
  } | null;
  daysOfWeek?: ("MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN")[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PromoType = "PERCENT" | "AMOUNT";
