import { useState } from "react"
import { toast } from "sonner"

interface UploadedFile {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  createdAt: string
}

interface UseCommentFileUploadOptions {
  ticketId: string
  maxFiles?: number
  maxFileSize?: number
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
]

const DEFAULT_MAX_FILES = 5
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function useCommentFileUpload({
  ticketId,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
}: UseCommentFileUploadOptions) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File "${file.name}" exceeds ${maxFileSize / 1024 / 1024}MB limit`
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type "${file.type}" is not allowed`
    }

    // Check max files
    if (uploadedFiles.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`
    }

    return null
  }

  const uploadFile = async (file: File): Promise<boolean> => {
    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return false
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`/api/tickets/${ticketId}/comments/attachments`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload file")
      }

      const uploadedFile: UploadedFile = await response.json()
      setUploadedFiles((prev) => [...prev, uploadedFile])
      toast.success(`Uploaded ${file.name}`)
      return true
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to upload ${file.name}`
      )
      return false
    } finally {
      setIsUploading(false)
    }
  }

  const uploadFiles = async (files: File[]): Promise<void> => {
    for (const file of files) {
      await uploadFile(file)
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const clearFiles = () => {
    setUploadedFiles([])
  }

  return {
    uploadedFiles,
    isUploading,
    uploadFile,
    uploadFiles,
    removeFile,
    clearFiles,
  }
}
