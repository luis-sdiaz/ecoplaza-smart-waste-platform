import {
  listWasteRecords,
  type WasteErrorCode,
} from './wasteService'
import {
  listSales,
  type SalesErrorCode,
} from './salesService'
import {
  toTimestampRange,
  type ReportDateRange,
} from './reportDateRange'
import {
  calculateReportStatistics,
  type ReportStatistics,
} from './reportCalculations'

export {
  calculateReportStatistics,
  calculateSalesTrend,
  type ReportCategoryDistributionItem,
  type ReportSalesTrendItem,
  type ReportStatistics,
  type ReportWasteCategory,
} from './reportCalculations'

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

  const statistics = calculateReportStatistics(wasteResult.data, salesResult.data)

  if (statistics === null) {
    return {
      ok: false,
      error: { code: 'database_error', retryable: false },
    }
  }

  return {
    ok: true,
    data: statistics,
  }
}
