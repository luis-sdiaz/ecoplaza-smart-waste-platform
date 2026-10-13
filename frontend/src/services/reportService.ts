import {
  calculateWasteStatistics,
  listWasteRecords,
  type WasteCategory,
  type WasteErrorCode,
} from './wasteService'
import {
  listSales,
  type SaleHistoryItem,
  type SalesErrorCode,
} from './salesService'
import {
  toTimestampRange,
  type ReportDateRange,
} from './reportDateRange'

export interface ReportCategoryDistributionItem {
  category: WasteCategory
  weightKg: number
  percentage: number
}

export interface ReportStatistics {
  wasteRecordCount: number
  totalRegisteredWeightKg: number
  availableWeightKg: number
  soldWeightKg: number
  salesCount: number
  grossSalesValue: number
  distribution: ReportCategoryDistributionItem[]
  salesTrend: ReportSalesTrendItem[]
}

export interface ReportSalesTrendItem {
  date: string
  salesCount: number
  grossSalesValue: number
}

export type ReportErrorCode =
  | 'unauthorized'
  | 'network_error'
  | 'permission_denied'
  | 'database_error'

export type ReportResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ReportErrorCode; retryable: boolean } }

function mapServiceError(
  code: WasteErrorCode | SalesErrorCode,
  retryable: boolean,
): ReportResult<never> {
  if (
    code === 'unauthorized' ||
    code === 'network_error' ||
    code === 'permission_denied'
  ) {
    return { ok: false, error: { code, retryable } }
  }

  return { ok: false, error: { code: 'database_error', retryable } }
}

function sumSafely(values: number[]): number | null {
  let sum = 0
  let correction = 0

  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) return null

    const adjustedValue = value - correction
    const nextSum = sum + adjustedValue
    correction = nextSum - sum - adjustedValue
    sum = nextSum

    if (!Number.isFinite(sum)) return null
  }

  return sum
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length
}

function toLocalDateKey(isoTimestamp: string): string | null {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return null

  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function calculateSalesTrend(
  sales: ReadonlyArray<Pick<SaleHistoryItem, 'soldAt' | 'totalValue'>>,
): ReportSalesTrendItem[] | null {
  const buckets = new Map<string, number[]>()

  for (const sale of sales) {
    const date = toLocalDateKey(sale.soldAt)
    if (date === null || !Number.isFinite(sale.totalValue) || sale.totalValue < 0) {
      return null
    }
    const values = buckets.get(date) ?? []
    values.push(sale.totalValue)
    buckets.set(date, values)
  }

  const trend: ReportSalesTrendItem[] = []
  const sortedBuckets = Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))

  for (const [date, values] of sortedBuckets) {
    const grossSalesValue = sumSafely(values)
    if (grossSalesValue === null) return null
    trend.push({ date, salesCount: values.length, grossSalesValue })
  }

  return trend
}

export async function getReportStatistics(dateRange?: ReportDateRange): Promise<
  ReportResult<ReportStatistics>
> {
  const timestampRange = dateRange === undefined
    ? undefined
    : toTimestampRange(dateRange)
  const [wasteResult, salesResult] = await Promise.all([
    listWasteRecords(timestampRange),
    listSales(timestampRange),
  ])

  if (!wasteResult.ok) {
    return mapServiceError(wasteResult.error.code, wasteResult.error.retryable)
  }

  if (!salesResult.ok) {
    return mapServiceError(salesResult.error.code, salesResult.error.retryable)
  }

  const wasteRecords = wasteResult.data
  const sales = salesResult.data

  if (
    hasDuplicateValues(wasteRecords.map((record) => record.id)) ||
    hasDuplicateValues(sales.map((sale) => sale.id)) ||
    hasDuplicateValues(sales.map((sale) => sale.wasteRecordId))
  ) {
    return {
      ok: false,
      error: { code: 'database_error', retryable: true },
    }
  }

  const wasteStatistics = calculateWasteStatistics(wasteRecords)
  const totalRegisteredWeightKg = sumSafely(
    wasteRecords.map((record) => record.weightKg),
  )
  const availableWeightKg = sumSafely(
    wasteRecords
      .filter((record) => record.status === 'available')
      .map((record) => record.weightKg),
  )
  const soldWeightKg = sumSafely(sales.map((sale) => sale.weightKg))
  const grossSalesValue = sumSafely(sales.map((sale) => sale.totalValue))
  const salesTrend = calculateSalesTrend(sales)

  if (
    totalRegisteredWeightKg === null ||
    availableWeightKg === null ||
    soldWeightKg === null ||
    grossSalesValue === null ||
    salesTrend === null
  ) {
    return {
      ok: false,
      error: { code: 'database_error', retryable: false },
    }
  }

  return {
    ok: true,
    data: {
      wasteRecordCount: wasteStatistics.recordCount,
      totalRegisteredWeightKg,
      availableWeightKg,
      soldWeightKg,
      salesCount: sales.length,
      grossSalesValue,
      salesTrend,
      distribution: [
        {
          category: 'organic',
          weightKg: wasteStatistics.organicWeightKg,
          percentage: wasteStatistics.organicPercentage,
        },
        {
          category: 'recyclable',
          weightKg: wasteStatistics.recyclableWeightKg,
          percentage: wasteStatistics.recyclablePercentage,
        },
        {
          category: 'nonRecyclable',
          weightKg: wasteStatistics.nonRecyclableWeightKg,
          percentage: wasteStatistics.nonRecyclablePercentage,
        },
      ],
    },
  }
}
