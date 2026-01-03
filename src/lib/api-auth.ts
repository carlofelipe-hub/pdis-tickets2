import { NextRequest } from "next/server"

/**
 * Validates API key from request headers against environment variable
 * Used for external service integrations (e.g., SAP)
 *
 * @param request - The incoming NextRequest
 * @returns true if API key is valid, false otherwise
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key")
  const validKey = process.env.SAP_API_KEY

  // Both API key and environment variable must be present
  if (!apiKey || !validKey) {
    return false
  }

  // Simple string comparison
  // TODO: Consider using crypto.timingSafeEqual for production to prevent timing attacks
  return apiKey === validKey
}
