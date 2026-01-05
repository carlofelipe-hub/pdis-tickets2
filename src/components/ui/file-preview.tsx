import { X, FileIcon, FileText, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface FilePreviewItem {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize?: number
}

interface FilePreviewProps {
  files: FilePreviewItem[]
  onRemove?: (id: string) => void
  readOnly?: boolean
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) {
    return null // Will show image thumbnail
  }
  if (fileType === "application/pdf") {
    return <FileText className="h-8 w-8 text-red-400" />
  }
  if (
    fileType === "application/msword" ||
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return <FileText className="h-8 w-8 text-blue-400" />
  }
  if (fileType === "text/plain") {
    return <FileText className="h-8 w-8 text-slate-400" />
  }
  if (fileType === "application/zip") {
    return <File className="h-8 w-8 text-yellow-400" />
  }
  return <FileIcon className="h-8 w-8 text-muted-foreground" />
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FilePreview({ files, onRemove, readOnly = false }: FilePreviewProps) {
  if (files.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {files.map((file) => {
        const isImage = file.fileType.startsWith("image/")
        const icon = getFileIcon(file.fileType)

        return (
          <div
            key={file.id}
            className="relative group rounded-lg border border-border bg-muted/50 overflow-hidden"
          >
            <a
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-square hover:bg-muted/70 transition-colors"
            >
              {isImage ? (
                <div className="relative w-full h-full">
                  <Image
                    src={file.fileUrl}
                    alt={file.fileName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4">
                  {icon}
                  <p className="text-xs text-muted-foreground text-center mt-2 line-clamp-2">
                    {file.fileName}
                  </p>
                </div>
              )}
            </a>

            {/* File info overlay (for images) */}
            {isImage && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-xs text-white truncate">{file.fileName}</p>
                {file.fileSize && (
                  <p className="text-xs text-white/70">{formatFileSize(file.fileSize)}</p>
                )}
              </div>
            )}

            {/* Remove button */}
            {!readOnly && onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault()
                  onRemove(file.id)
                }}
                className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
