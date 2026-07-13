export function toCsv(rows: ReadonlyArray<Record<string, unknown>>) {
  if (rows.length === 0) {
    return ''
  }

  const headers = Object.keys(rows[0])
  const lines = rows.map((row) =>
    headers
      .map((header) => {
        const value = String(row[header] ?? '')

        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }

        return value
      })
      .join(',')
  )

  return [headers.join(','), ...lines].join('\n')
}
