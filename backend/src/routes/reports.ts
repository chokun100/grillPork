import { Hono } from 'hono'
import { validateApiKey, requireScopes } from '../middleware/auth'
import { errorHandler } from '../middleware/validation'
import prisma from '../lib/db'
import { Decimal } from '@prisma/client/runtime/library'

const reports = new Hono()

reports.use('*', validateApiKey)
reports.use('*', errorHandler)

// Daily report
reports.get('/daily',
  requireScopes(['cashier:read', 'admin:read', 'read-only:read']),
  async (c) => {
    try {
      const dateParam = c.req.query('date')
      let reportDate = new Date()
      
      if (dateParam) {
        // Parse the date parameter properly
        reportDate = new Date(dateParam)
        
        // Validate the date
        if (isNaN(reportDate.getTime())) {
          return c.json({ 
            ok: false, 
            error: { 
              code: 'INVALID_DATE', 
              message: 'Invalid date format. Please use YYYY-MM-DD format.' 
            } 
          }, 400)
        }
      }
      
      // Set time to start and end of day (UTC time to avoid timezone issues)
      const startOfDay = new Date(reportDate)
      startOfDay.setUTCHours(0, 0, 0, 0)
      
      const endOfDay = new Date(reportDate)
      endOfDay.setUTCHours(23, 59, 59, 999)

      // Get bills for the day
      const bills = await prisma.bill.findMany({
        where: {
          openedAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            in: ['CLOSED', 'VOID']
          }
        },
        include: {
          table: {
            select: {
              code: true
            }
          },
          customer: {
            select: {
              id: true,
              phone: true
            }
          }
        }
      })

      // Calculate metrics
      const closedBills = bills.filter(bill => bill.status === 'CLOSED')
      const voidBills = bills.filter(bill => bill.status === 'VOID')

      const totalSales = closedBills.reduce((sum, bill) => 
        sum + bill.totalGross.toNumber(), 0)
      
      const totalVAT = closedBills.reduce((sum, bill) => 
        sum + bill.vatAmount.toNumber(), 0)
      
      const totalAdults = closedBills.reduce((sum, bill) => 
        sum + bill.adultCount, 0)
      
      const totalChildren = closedBills.reduce((sum, bill) => 
        sum + bill.childCount, 0)
      
      const totalCustomers = totalAdults + totalChildren

      // Table turns (unique tables used)
      const uniqueTables = new Set(closedBills.map(bill => bill.tableId))
      const tableTurns = uniqueTables.size

      // Average bill amount
      const averageBill = closedBills.length > 0 
        ? totalSales / closedBills.length 
        : 0

      // Hourly breakdown - using Prisma ORM instead of raw SQL to avoid compatibility issues
      const allClosedBills = await prisma.bill.findMany({
        where: {
          openedAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: 'CLOSED'
        },
        select: {
          totalGross: true,
          adultCount: true,
          childCount: true,
          openedAt: true
        }
      })

      // Group bills by hour and calculate metrics
      const hourlyMap = new Map<number, {
        sales: number
        bills: number
        customers: number
      }>()

      for (const bill of allClosedBills) {
        const hour = new Date(bill.openedAt).getUTCHours()
        
        if (!hourlyMap.has(hour)) {
          hourlyMap.set(hour, {
            sales: 0,
            bills: 0,
            customers: 0
          })
        }
        
        const hourData = hourlyMap.get(hour)!
        hourData.sales += bill.totalGross.toNumber()
        hourData.bills += 1
        hourData.customers += bill.adultCount + bill.childCount
      }

      // Convert to array and sort by hour
      const hourlyData = Array.from(hourlyMap.entries())
        .map(([hour, data]) => ({
          hour,
          sales: data.sales,
          bills: data.bills,
          customers: data.customers
        }))
        .sort((a, b) => a.hour - b.hour)

      // Get payment methods breakdown
      const paymentMethods = await prisma.bill.groupBy({
        by: ['paymentMethod'],
        where: {
          openedAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: 'CLOSED'
        },
        _sum: {
          totalGross: true,
          paidAmount: true
        },
        _count: {
          id: true
        }
      })

      // Get loyalty usage
      const loyaltyUsage = await prisma.bill.count({
        where: {
          openedAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: 'CLOSED',
          loyaltyFreeApplied: true
        }
      })

      return c.json({
        ok: true,
        data: {
          date: reportDate.toISOString().split('T')[0],
          summary: {
            totalSalesGross: totalSales,
            totalVAT,
            tableTurns,
            totalCustomers,
            billsCount: closedBills.length,
            voidBillsCount: voidBills.length,
            averageBill,
            loyaltyFreeApplied: loyaltyUsage
          },
          hourlyBreakdown: hourlyData.map(hour => ({
            hour: hour.hour,
            sales: hour.sales,
            bills: hour.bills,
            customers: hour.customers
          })),
          paymentMethods: paymentMethods.map(method => ({
            method: method.paymentMethod,
            totalAmount: method._sum.totalGross?.toNumber() || 0,
            paidAmount: method._sum.paidAmount?.toNumber() || 0,
            transactionCount: method._count.id
          }))
        }
      })
    } catch (error) {
      console.error('Generate daily report error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to generate daily report' 
        } 
      }, 500)
    }
  }
)

// Monthly summary report
reports.get('/monthly',
  requireScopes(['admin:read', 'read-only:read']),
  async (c) => {
    try {
      const monthParam = c.req.query('month') // YYYY-MM format
      let targetMonth = new Date().toISOString().slice(0, 7)
      
      if (monthParam) {
        // Validate month format (YYYY-MM)
        const monthRegex = /^\d{4}-\d{2}$/
        if (!monthRegex.test(monthParam)) {
          return c.json({ 
            ok: false, 
            error: { 
              code: 'INVALID_MONTH', 
              message: 'Invalid month format. Please use YYYY-MM format.' 
            } 
          }, 400)
        }
        
        const [year, month] = monthParam.split('-').map(Number)
        if (year < 1970 || year > 2100 || month < 1 || month > 12) {
          return c.json({ 
            ok: false, 
            error: { 
              code: 'INVALID_MONTH', 
              message: 'Invalid month values. Please use valid year and month.' 
            } 
          }, 400)
        }
        
        targetMonth = monthParam
      }
      
      const [year, month] = targetMonth.split('-').map(Number)
      const startDate = new Date(Date.UTC(year, month - 1, 1))
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

      // Get monthly data
      const monthlyData = await prisma.bill.groupBy({
        by: ['status'],
        where: {
          openedAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          totalGross: true,
          vatAmount: true,
          paidAmount: true
        },
        _count: {
          id: true
        },
        _avg: {
          totalGross: true,
          adultCount: true,
          childCount: true
        }
      })

      // Calculate totals
      const monthlyTotals = monthlyData.reduce((acc, day) => {
        acc.totalSales += day._sum.totalGross?.toNumber() || 0
        acc.totalVAT += day._sum.vatAmount?.toNumber() || 0
        acc.totalBills += day._count.id
        acc.totalCustomers += (day._avg.adultCount || 0) + (day._avg.childCount || 0)
        return acc
      }, { totalSales: 0, totalVAT: 0, totalBills: 0, totalCustomers: 0 })

      return c.json({ 
        ok: true, 
        data: {
          month: targetMonth,
          summary: {
            totalSalesGross: monthlyTotals.totalSales,
            totalVAT: monthlyTotals.totalVAT,
            totalBills: monthlyTotals.totalBills,
            totalCustomers: monthlyTotals.totalCustomers,
            averageBill: monthlyTotals.totalBills > 0 ? monthlyTotals.totalSales / monthlyTotals.totalBills : 0
          },
          breakdown: monthlyData.map(day => ({
            status: day.status,
            totalSales: day._sum.totalGross?.toNumber() || 0,
            totalVAT: day._sum.vatAmount?.toNumber() || 0,
            billCount: day._count.id,
            averageBill: day._avg.totalGross || 0,
            averageAdults: day._avg.adultCount || 0,
            averageChildren: day._avg.childCount || 0
          }))
        }
      })
    } catch (error) {
      console.error('Generate monthly report error:', error)
      return c.json({ 
        ok: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to generate monthly report' 
        } 
      }, 500)
    }
  }
)

export default reports