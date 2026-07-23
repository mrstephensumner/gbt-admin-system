import { mapHeaders, splitTopics, type NormalisedRow } from '@shared/importing'

/**
 * Browser-side file parsing (spec 003 research R1): CSV/XLSX/JSON →
 * NormalisedRow[]. The server re-validates everything; this is convenience,
 * not a trust boundary. Parsing libraries load lazily so the main bundle
 * stays lean.
 */
export const MAX_FILE_BYTES = 25 * 1024 * 1024

export interface ParsedFile {
  rows: NormalisedRow[]
  unmappedHeaders: string[]
}

export async function parseRosterFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Files must be 25 MB or smaller')
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return parseCsv(file)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXlsx(file)
  if (name.endsWith('.json')) return parseJson(file)
  throw new Error('Use a CSV, Excel or JSON export file')
}

function tableToRows(table: (string | number | null | undefined)[][]): ParsedFile {
  const [headerRow, ...dataRows] = table
  if (!headerRow || headerRow.length === 0) throw new Error('The file has no header row')
  const headers = headerRow.map((h) => String(h ?? ''))
  const { mapping, unmapped } = mapHeaders(headers)

  const cell = (row: (string | number | null | undefined)[], field: keyof NormalisedRow): string | null => {
    const idx = mapping[field]
    if (idx === undefined) return null
    const value = row[idx]
    if (value == null) return null
    const s = String(value).trim()
    return s === '' ? null : s
  }

  const rows: NormalisedRow[] = dataRows
    .filter((r) => r.some((v) => v != null && String(v).trim() !== ''))
    .map((r) => ({
      source_id: cell(r, 'source_id') ?? '',
      name: cell(r, 'name') ?? '',
      headline: cell(r, 'headline'),
      biography: cell(r, 'biography'),
      topics: splitTopics(cell(r, 'topics' as keyof NormalisedRow)),
      day_rate_raw: cell(r, 'day_rate_raw'),
      location: cell(r, 'location'),
      email: cell(r, 'email'),
      phone: cell(r, 'phone'),
      photo_url: cell(r, 'photo_url'),
    }))
  return { rows, unmappedHeaders: unmapped }
}

async function parseCsv(file: File): Promise<ParsedFile> {
  const Papa = (await import('papaparse')).default
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy',
      complete: (result) => {
        try {
          resolve(tableToRows(result.data))
        } catch (err) {
          reject(err instanceof Error ? err : new Error('The file could not be read'))
        }
      },
      error: () => reject(new Error('The file could not be read')),
    })
  })
}

async function parseXlsx(file: File): Promise<ParsedFile> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('The workbook has no sheets')
  const table = XLSX.utils.sheet_to_json<(string | number | null)[]>(workbook.Sheets[sheetName]!, {
    header: 1,
    raw: false,
    defval: null,
  })
  return tableToRows(table)
}

async function parseJson(file: File): Promise<ParsedFile> {
  const parsed = JSON.parse(await file.text()) as unknown
  const list = Array.isArray(parsed) ? parsed : ((parsed as { items?: unknown[] }).items ?? null)
  if (!Array.isArray(list)) throw new Error('JSON files must contain an array of records')
  // Object records: keys act as headers through the same synonym mapping
  const keys = [...new Set(list.flatMap((r) => Object.keys(r as Record<string, unknown>)))]
  const table: (string | null)[][] = [
    keys,
    ...list.map((r) => keys.map((k) => {
      const v = (r as Record<string, unknown>)[k]
      return v == null ? null : String(v)
    })),
  ]
  return tableToRows(table)
}
