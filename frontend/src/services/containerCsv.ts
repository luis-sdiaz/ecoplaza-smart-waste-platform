import type { Container } from "./containerService";
import {
  createCsvRow,
  createUtf8Csv,
  saveCsvFile,
  type CsvExportLanguage,
  type SaveCsvResult,
} from "./csvService.ts";

export interface ContainerCsvLabels {
  id: string;
  code: string;
  createdAt: string;
}

export function createContainerCsv(
  containers: ReadonlyArray<Container>,
  labels: ContainerCsvLabels,
  language: CsvExportLanguage,
): string {
  return createUtf8Csv([
    createCsvRow([labels.id, labels.code, labels.createdAt], language),
    ...containers.map((container) => createCsvRow([
      container.id,
      container.code,
      container.createdAt,
    ], language)),
  ]);
}

export function saveContainerCsv(
  containers: ReadonlyArray<Container>,
  labels: ContainerCsvLabels,
  language: CsvExportLanguage,
  defaultFileName: string,
): Promise<SaveCsvResult> {
  return saveCsvFile(createContainerCsv(containers, labels, language), defaultFileName);
}
