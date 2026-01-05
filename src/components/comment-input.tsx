"use client"

import { useState, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { FilePreview } from "@/components/ui/file-preview"
import { useCommentFileUpload } from "@/hooks/useCommentFileUpload"
import { Send, Upload, Loader2, Paperclip } from "lucide-react"

interface CommentInputProps {
  ticketId: string
  onSubmit: (content: string, attachmentIds: string[]) => Promise<void>
  isSubmitting: boolean
}

export function CommentInput({ ticketId, onSubmit, isSubmitting }: CommentInputProps) {
  const [content, setContent] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    uploadedFiles,
    isUploading,
    uploadFile,
    uploadFiles,
    removeFile,
    clearFiles,
  } = useCommentFileUpload({ ticketId })

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (file) {
          imageFiles.push(file)
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault()
      await uploadFiles(imageFiles)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    await uploadFiles(Array.from(files))

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() && uploadedFiles.length === 0) return

    const attachmentIds = uploadedFiles.map((f) => f.id)
    await onSubmit(content, attachmentIds)

    // Clear form after successful submission
    setContent("")
    clearFiles()
  }

  const canSubmit = (content.trim() || uploadedFiles.length > 0) && !isSubmitting && !isUploading

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Add a comment... (Paste screenshots with Cmd+V or Ctrl+V)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handlePaste}
        className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground resize-none min-h-[100px]"
        rows={3}
        disabled={isSubmitting}
      />

      {/* File Attachments */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Attachments ({uploadedFiles.length})
          </Label>
          <FilePreview files={uploadedFiles} onRemove={removeFile} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            id="comment-file-upload"
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            disabled={isSubmitting || isUploading}
          />
          <Label
            htmlFor="comment-file-upload"
            className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors border border-border text-sm"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Paperclip className="h-4 w-4" />
                <span>Attach Files</span>
              </>
            )}
          </Label>
          <p className="text-xs text-muted-foreground hidden sm:block">
            or paste screenshots directly
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Max 10MB per file. Supported: Images, PDF, DOC, TXT, ZIP. Up to 5 files.
      </p>
    </div>
  )
}
