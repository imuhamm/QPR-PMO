import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { BusinessCaseFile } from './businessCaseData'
import { fileExtensionLabel, fmtUploadedDate, formatFileSize, validateFile } from './businessCaseData'
import { SaveErrorNotice } from '../shared/validation/SaveErrorNotice'

const UPLOAD_DELAY = 700

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type Status = 'idle' | 'invalid' | 'uploading' | 'error' | 'confirm-replace' | 'confirm-remove'

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Business Case</h2>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Optional</span>
      </div>
      {children}
    </div>
  )
}

// Modeled as a list capped at one entry by this prototype's UI, not the data
// shape — whether multiple Business Case files are ever allowed is
// unconfirmed, same convention as Strategic Alignment.
export function BusinessCaseView({
  onSaveStart,
  onSaveEnd,
}: {
  onSaveStart: () => void
  onSaveEnd: (success: boolean) => void
}) {
  const [files, setFiles] = useState<BusinessCaseFile[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const uploadFailedOnce = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingFile = files[0] ?? null

  const handleChooseFile = () => fileInputRef.current?.click()

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const err = validateFile(file)
    if (err) {
      setPendingFile(file)
      setMessage(err)
      setStatus('invalid')
      return
    }

    if (existingFile) {
      setPendingFile(file)
      setStatus('confirm-replace')
    } else {
      void startUpload(file)
    }
  }

  const startUpload = async (file: File) => {
    setPendingFile(file)
    setStatus('uploading')
    setMessage(null)
    onSaveStart()
    try {
      if (!uploadFailedOnce.current) {
        uploadFailedOnce.current = true
        await delay(UPLOAD_DELAY)
        onSaveEnd(false)
        throw new Error("Couldn't upload this file")
      }
      await delay(UPLOAD_DELAY)
      const newFile: BusinessCaseFile = {
        id: `bc-${Date.now()}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        objectUrl: URL.createObjectURL(file),
      }
      setFiles((prev) => {
        prev.forEach((f) => URL.revokeObjectURL(f.objectUrl))
        return [newFile]
      })
      onSaveEnd(true)
      setStatus('idle')
      setPendingFile(null)
    } catch (err) {
      onSaveEnd(false)
      setMessage(err instanceof Error ? err.message : "Couldn't upload this file")
      setStatus('error')
    }
  }

  const handleRetryUpload = () => {
    if (pendingFile) void startUpload(pendingFile)
  }

  const handleConfirmReplace = () => {
    if (pendingFile) void startUpload(pendingFile)
  }

  const handleCancelReplace = () => {
    setPendingFile(null)
    setStatus('idle')
  }

  const handleConfirmRemove = async () => {
    onSaveStart()
    await delay(400)
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.objectUrl))
      return []
    })
    onSaveEnd(true)
    setStatus('idle')
  }

  const handleCancelRemove = () => setStatus('idle')

  const input = <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />

  if (status === 'invalid') {
    return (
      <Frame>
        {input}
        <div className="max-w-md rounded border border-rose-200 bg-rose-50 px-3 py-3">
          <p className="text-xs text-rose-700">{message}</p>
          <button
            type="button"
            onClick={() => {
              setStatus('idle')
              setPendingFile(null)
            }}
            className="mt-2 rounded border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            Choose a different file
          </button>
        </div>
      </Frame>
    )
  }

  if (status === 'uploading') {
    return (
      <Frame>
        {input}
        <div className="flex max-w-md items-center gap-2 rounded border border-slate-200 px-3 py-3">
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          <span className="truncate text-xs text-slate-500">Uploading {pendingFile?.name}…</span>
        </div>
      </Frame>
    )
  }

  if (status === 'error') {
    return (
      <Frame>
        {input}
        <div className="max-w-md">
          <SaveErrorNotice message={message ?? "Couldn't upload this file"} onRetry={handleRetryUpload} />
        </div>
      </Frame>
    )
  }

  if (status === 'confirm-replace' && pendingFile && existingFile) {
    return (
      <Frame>
        {input}
        <div className="max-w-md rounded border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-xs text-amber-800">
            Replace <span className="font-medium">{existingFile.name}</span> with{' '}
            <span className="font-medium">{pendingFile.name}</span>?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleConfirmReplace}
              className="rounded bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleCancelReplace}
              className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Frame>
    )
  }

  if (status === 'confirm-remove' && existingFile) {
    return (
      <Frame>
        {input}
        <div className="max-w-md rounded border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-xs text-amber-800">
            Remove <span className="font-medium">{existingFile.name}</span>? You can upload another Business Case
            afterward.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleConfirmRemove}
              className="rounded bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={handleCancelRemove}
              className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Frame>
    )
  }

  if (existingFile) {
    return (
      <Frame>
        {input}
        <div className="flex max-w-2xl items-center gap-3 rounded border border-slate-200 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-semibold text-slate-500">
            {fileExtensionLabel(existingFile)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-slate-800">{existingFile.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
              <span>{formatFileSize(existingFile.size)}</span>
              <span>·</span>
              <span>Uploaded {fmtUploadedDate(existingFile.uploadedAt)}</span>
              <span>·</span>
              <span title="Not tracked in this prototype">Uploaded by —</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-[11px] font-medium">
            <a href={existingFile.objectUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
              Open
            </a>
            <a href={existingFile.objectUrl} download={existingFile.name} className="text-blue-600 hover:text-blue-700">
              Download
            </a>
            <button type="button" onClick={handleChooseFile} className="text-slate-600 hover:text-slate-800">
              Replace
            </button>
            <button type="button" onClick={() => setStatus('confirm-remove')} className="text-rose-600 hover:text-rose-700">
              Remove
            </button>
          </div>
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      {input}
      <div className="max-w-md rounded border border-dashed border-slate-300 px-4 py-4">
        <p className="text-xs text-slate-500">A supporting Business Case document can be attached to this Project.</p>
        <button
          type="button"
          onClick={handleChooseFile}
          className="mt-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          Upload Business Case
        </button>
        <p className="mt-2 text-[10px] italic text-slate-400">
          File type and size aren't restricted yet — pending business confirmation.
        </p>
      </div>
    </Frame>
  )
}
