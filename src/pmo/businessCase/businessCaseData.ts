export interface BusinessCaseFile {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string
  objectUrl: string
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function fileExtensionLabel(file: { name: string; type: string }): string {
  const dotIdx = file.name.lastIndexOf('.')
  if (dotIdx > 0 && dotIdx < file.name.length - 1) return file.name.slice(dotIdx + 1).toUpperCase()
  const subtype = file.type.split('/')[1]
  return subtype ? subtype.toUpperCase() : 'FILE'
}

export function fmtUploadedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Accepted formats and a max size are not confirmed business rules — these
// stay unset (unrestricted) rather than guessing. The shape exists so a
// later, confirmed rule is a constant change here, not a redesign.
export const ACCEPTED_FILE_TYPES: string[] | null = null
export const MAX_FILE_SIZE_BYTES: number | null = null

export function validateFile(file: File): string | null {
  if (file.size === 0) return 'This file appears to be empty.'
  if (MAX_FILE_SIZE_BYTES !== null && file.size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds the maximum size of ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`
  }
  if (ACCEPTED_FILE_TYPES !== null && !ACCEPTED_FILE_TYPES.includes(file.type)) {
    return 'This file type is not supported.'
  }
  return null
}
