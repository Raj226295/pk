import api from './api.js'

function parseDownloadFilename(contentDisposition, fallbackName) {
  if (!contentDisposition) {
    return fallbackName
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)

  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1])
  }

  const standardMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
  return standardMatch?.[1] || fallbackName
}

export async function downloadFileFromApi(url, fallbackName = 'document') {
  const response = await api.get(url, {
    responseType: 'blob',
  })

  const downloadName = parseDownloadFilename(response.headers['content-disposition'], fallbackName)
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
  const link = window.document.createElement('a')
  link.href = blobUrl
  link.download = downloadName
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

export async function openFileFromApi(url, fallbackType = 'text/html') {
  const popup = window.open('', '_blank')

  const response = await api.get(url, {
    responseType: 'blob',
  })

  const contentType = response.headers['content-type'] || fallbackType
  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: contentType }))

  if (popup) {
    popup.location.href = blobUrl
  } else {
    window.open(blobUrl, '_blank', 'noopener,noreferrer')
  }

  window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000)
}
