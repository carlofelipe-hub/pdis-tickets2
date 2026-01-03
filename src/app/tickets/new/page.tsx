"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Bug, Lightbulb, Wrench, HelpCircle, CheckCircle2, TicketIcon, Upload, X, FileIcon } from "lucide-react"
import Link from "next/link"

const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title must be less than 200 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: z.enum(["BUG", "FEATURE_REQUEST", "ENHANCEMENT", "SUPPORT", "TASK", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  stepsToReproduce: z.string().optional(),
  contactEmail: z.string().email("Please enter a valid email"),
  contactPhone: z.string().optional(),
})

type TicketFormData = z.infer<typeof ticketSchema>

const categoryOptions = [
  { value: "BUG", label: "Bug Report", icon: Bug, color: "text-red-400", description: "Something isn't working correctly" },
  { value: "SUPPORT", label: "Support", icon: HelpCircle, color: "text-green-400", description: "Get help with an issue" },
  { value: "OTHER", label: "Other", icon: TicketIcon, color: "text-slate-400", description: "Doesn't fit other categories" },
]

const priorityOptions = [
  { value: "LOW", label: "Low", description: "Minor issue, can wait" },
  { value: "MEDIUM", label: "Medium", description: "Important but not urgent" },
  { value: "HIGH", label: "High", description: "Needs attention soon" },
  { value: "URGENT", label: "Urgent", description: "Critical issue, needs immediate attention" },
]

function NewTicketForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, setSelectedCategory] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<string>("")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: "MEDIUM",
      contactEmail: session?.user?.email || "",
    },
  })

  const watchCategory = watch("category")

  // Set category from URL parameter
  useEffect(() => {
    const categoryParam = searchParams.get("category")
    if (categoryParam && categoryOptions.some(c => c.value === categoryParam)) {
      setValue("category", categoryParam as TicketFormData["category"])
      setSelectedCategory(categoryParam)
    }
  }, [searchParams, setValue])

  // Set contact email from session
  useEffect(() => {
    if (session?.user?.email) {
      setValue("contactEmail", session.user.email)
    }
  }, [session, setValue])

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newFiles = Array.from(files)
    const validFiles = newFiles.filter((file) => {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 10MB limit`)
        return false
      }
      return true
    })

    setSelectedFiles((prev) => [...prev, ...validFiles])
  }

  // Remove file from selection
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Upload attachments to a ticket
  const uploadAttachments = async (ticketId: string) => {
    if (selectedFiles.length === 0) return

    setUploadProgress(`Uploading ${selectedFiles.length} file(s)...`)

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      setUploadProgress(`Uploading ${i + 1}/${selectedFiles.length}: ${file.name}`)

      const formData = new FormData()
      formData.append("file", file)

      try {
        const response = await fetch(`/api/tickets/${ticketId}/attachments`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`, {
          description: error instanceof Error ? error.message : "Please try uploading manually",
        })
      }
    }

    setUploadProgress("")
  }

  const onSubmit = async (data: TicketFormData) => {
    setIsSubmitting(true)

    try {
      // Create the ticket
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create ticket")
      }

      const ticket = await response.json()

      // Upload attachments if any
      if (selectedFiles.length > 0) {
        await uploadAttachments(ticket.id)
      }

      toast.success("Ticket created successfully!", {
        description: `Ticket ${ticket.ticketNumber} has been submitted for approval.`,
      })
      router.push(`/tickets/${ticket.id}`)
    } catch (error) {
      toast.error("Failed to create ticket", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Ticket</h1>
          <p className="text-muted-foreground mt-1">
            Submit a ticket to the development team
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Category Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What type of ticket is this?</CardTitle>
            <CardDescription>
              Select the category that best describes your request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categoryOptions.map((option) => {
                const Icon = option.icon
                const isSelected = watchCategory === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setValue("category", option.value as TicketFormData["category"])
                      setSelectedCategory(option.value)
                    }}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-border bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-2 ${option.color}`} />
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </button>
                )
              })}
            </div>
            {errors.category && (
              <p className="text-red-400 text-sm mt-2">{errors.category.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Ticket Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ticket Details</CardTitle>
            <CardDescription>
              Provide as much detail as possible
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Brief summary of the issue or request"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-red-400 text-sm">{errors.title.message}</p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority <span className="text-red-400">*</span>
              </Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) => setValue("priority", value as TicketFormData["priority"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-red-400 text-sm">{errors.priority.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Provide a detailed description of the issue or request..."
                rows={5}
                className="resize-none"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-red-400 text-sm">{errors.description.message}</p>
              )}
            </div>

            {/* Steps to Reproduce (for bugs) */}
            {watchCategory === "BUG" && (
              <div className="space-y-2">
                <Label htmlFor="stepsToReproduce">
                  Steps to Reproduce
                </Label>
                <Textarea
                  id="stepsToReproduce"
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                  rows={4}
                  className="resize-none"
                  {...register("stepsToReproduce")}
                />
                <p className="text-xs text-muted-foreground">
                  List the steps to reproduce the bug, one per line
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
            <CardDescription>
              How can we reach you about this ticket?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="contactEmail">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="your.email@projectduo.com"
                  {...register("contactEmail")}
                />
                {errors.contactEmail && (
                  <p className="text-red-400 text-sm">{errors.contactEmail.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="contactPhone">
                  Phone (Optional)
                </Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+63 XXX XXX XXXX"
                  {...register("contactPhone")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attachments</CardTitle>
            <CardDescription>
              Upload screenshots, documents, or other files (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload Button */}
            <div className="flex items-center gap-4">
              <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              />
              <Label
                htmlFor="file-upload"
                className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors border border-border"
              >
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">Choose Files</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Max 10MB per file. Supported: images, PDF, DOC, TXT, ZIP
              </p>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Files ({selectedFiles.length})</Label>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{uploadProgress}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <Link href="/tickets">
            <Button variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Submit Ticket"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    }>
      <NewTicketForm />
    </Suspense>
  )
}

