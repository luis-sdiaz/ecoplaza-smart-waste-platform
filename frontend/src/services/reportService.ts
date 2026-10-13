import {
  calculateWasteStatistics,
  listWasteRecords,
  type WasteCategory,
  type WasteErrorCode,
} from './wasteService'
import { listSales, type SalesErrorCode } from './salesService'

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

export async function getReportStatistics(): Promise<
  ReportResult<ReportStatistics>
> {
  const [wasteResult, salesResult] = await Promise.all([
    listWasteRecords(),
    listSales(),
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

  if (
    totalRegisteredWeightKg === null ||
    availableWeightKg === null ||
    soldWeightKg === null ||
    grossSalesValue === null
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
