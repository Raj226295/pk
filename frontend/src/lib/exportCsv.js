function escapeCsvCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function exportCsv(filename, rows, columns) {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(',')
  const body = rows
    .map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(','))
    .join('\n')
  const csv = [header, body].filter(Boolean).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = filename
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
