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
