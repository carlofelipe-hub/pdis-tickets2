# SAP Integration API Documentation

## Overview

The SAP Integration API allows the SAP system to automatically create bug tickets in the PDIS Tickets system. Tickets created through this API bypass the normal approval workflow and are immediately marked as `SUBMITTED` (ready for assignment to developers).

## Authentication

The API uses **API Key authentication** via HTTP headers.

### Header Required
```
x-api-key: <your-api-key>
```

### API Key Location
The API key is stored in the environment variable `SAP_API_KEY` on the server.

**Current API Key**: `eC3AjW2pga1ADq3DeE5PI00m2kx79RzdksDDvz2QPyQ=`

⚠️ **Security Note**: Keep this key confidential. Do not commit it to version control or share it publicly.

## Endpoint

### Create SAP Ticket

**URL**: `/api/external/sap/tickets`
**Method**: `POST`
**Content-Type**: `application/json`
**Authentication**: API Key (x-api-key header)

## Request Format

### Request Body

```json
{
  "sapPayload": {
    // Any JSON object containing SAP request data
  },
  "sapResponse": {
    // Any JSON object containing SAP response/error data
  },
  "formData": {
    // Any JSON object containing form or user data
  }
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sapPayload` | Object | Yes | JSON object containing the original SAP request payload |
| `sapResponse` | Object | Yes | JSON object containing SAP's response or error details |
| `formData` | Object | Yes | JSON object containing form data or additional context |

**Note**: All three fields accept any valid JSON object. The structure is flexible to accommodate different SAP error scenarios.

## Response Format

### Success Response

**Status Code**: `200 OK`

```json
{
  "success": true,
  "ticketNumber": "TKT-2601-0042",
  "ticketId": "clx1234567890abcdef"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Always `true` for successful requests |
| `ticketNumber` | String | Human-readable ticket number (format: `TKT-YYMM-NNNN`) |
| `ticketId` | String | Database ID of the created ticket |

### Error Responses

#### 401 Unauthorized
Missing or invalid API key.

```json
{
  "error": "Unauthorized - Invalid or missing API key"
}
```

#### 400 Bad Request
Invalid request body or missing required fields.

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "sapPayload",
      "message": "Required"
    }
  ]
}
```

#### 404 Not Found
Configuration error - submitter user not found in database.

```json
{
  "error": "Configuration error - Submitter user not found"
}
```

#### 500 Internal Server Error
Server or database error.

```json
{
  "error": "Failed to create ticket"
}
```

## Ticket Properties

Tickets created via the SAP API have the following fixed properties:

| Property | Value | Description |
|----------|-------|-------------|
| **Title** | "SAP Integration Fail" | Fixed title for all SAP tickets |
| **Category** | BUG | Always categorized as a bug report |
| **Priority** | URGENT | Always marked as urgent priority |
| **Status** | SUBMITTED | Bypasses approval, ready for assignment |
| **Submitter** | cmg07ttto0002pb0k2i3w9qcu | Fixed system user ID |
| **Process Owner** | null | No approval needed |
| **Submitted At** | Current timestamp | Automatically set when ticket is created |

### Description Format

The ticket description is automatically formatted to include all three JSON payloads in a readable format:

```
SAP Integration Error - Automatic ticket created by SAP system

SAP PAYLOAD:
{
  "transactionId": "TX-12345",
  "module": "FI-CO",
  "operation": "POST_INVOICE"
}

SAP RESPONSE:
{
  "errorCode": "E001",
  "errorMessage": "Connection timeout",
  "timestamp": "2026-01-03T10:30:00Z"
}

FORM DATA:
{
  "userId": "sap_user_123",
  "company": "ABC Corp",
  "amount": 15000.00
}
```

## Example Usage

### cURL Example

```bash
curl -X POST https://pdis-tickets.projectduo.ph/api/external/sap/tickets \
  -H "Content-Type: application/json" \
  -H "x-api-key: eC3AjW2pga1ADq3DeE5PI00m2kx79RzdksDDvz2QPyQ=" \
  -d '{
    "sapPayload": {
      "transactionId": "TX-12345",
      "module": "FI-CO",
      "operation": "POST_INVOICE",
      "requestTimestamp": "2026-01-03T10:29:55Z"
    },
    "sapResponse": {
      "errorCode": "E001",
      "errorMessage": "Connection timeout to backend system",
      "httpStatus": 504,
      "timestamp": "2026-01-03T10:30:00Z"
    },
    "formData": {
      "userId": "sap_user_123",
      "userName": "John Doe",
      "company": "ABC Corp",
      "amount": 15000.00,
      "currency": "PHP",
      "invoiceNumber": "INV-2026-001"
    }
  }'
```

### JavaScript/Node.js Example

```javascript
async function createSAPTicket(sapPayload, sapResponse, formData) {
  const response = await fetch('https://pdis-tickets.projectduo.ph/api/external/sap/tickets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'eC3AjW2pga1ADq3DeE5PI00m2kx79RzdksDDvz2QPyQ='
    },
    body: JSON.stringify({
      sapPayload,
      sapResponse,
      formData
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create ticket: ${error.error}`);
  }

  const result = await response.json();
  console.log(`Ticket created: ${result.ticketNumber}`);
  return result;
}

// Usage example
try {
  const result = await createSAPTicket(
    {
      transactionId: 'TX-12345',
      module: 'FI-CO',
      operation: 'POST_INVOICE'
    },
    {
      errorCode: 'E001',
      errorMessage: 'Connection timeout',
      timestamp: new Date().toISOString()
    },
    {
      userId: 'sap_user_123',
      company: 'ABC Corp',
      amount: 15000.00
    }
  );

  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Python Example

```python
import requests
import json

def create_sap_ticket(sap_payload, sap_response, form_data):
    url = 'https://pdis-tickets.projectduo.ph/api/external/sap/tickets'
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': 'eC3AjW2pga1ADq3DeE5PI00m2kx79RzdksDDvz2QPyQ='
    }

    payload = {
        'sapPayload': sap_payload,
        'sapResponse': sap_response,
        'formData': form_data
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        result = response.json()
        print(f"Ticket created: {result['ticketNumber']}")
        return result
    else:
        error = response.json()
        raise Exception(f"Failed to create ticket: {error.get('error')}")

# Usage example
try:
    result = create_sap_ticket(
        sap_payload={
            'transactionId': 'TX-12345',
            'module': 'FI-CO',
            'operation': 'POST_INVOICE'
        },
        sap_response={
            'errorCode': 'E001',
            'errorMessage': 'Connection timeout',
            'timestamp': '2026-01-03T10:30:00Z'
        },
        form_data={
            'userId': 'sap_user_123',
            'company': 'ABC Corp',
            'amount': 15000.00
        }
    )

    print('Success:', result)
except Exception as e:
    print('Error:', str(e))
```

## Ticket Workflow

### Standard User Ticket Flow
```
User submits ticket → FOR_PD_APPROVAL → Process Owner approves → SUBMITTED → DEV_IN_PROGRESS → ...
```

### SAP Integration Ticket Flow
```
SAP calls API → Immediately SUBMITTED (bypasses approval) → DEV_IN_PROGRESS → ...
```

## Status Progression

Once a SAP ticket is created with `SUBMITTED` status, it follows the normal development workflow:

1. **SUBMITTED** - Ready for assignment (starting point for SAP tickets)
2. **DEV_IN_PROGRESS** - Developer is working on the fix
3. **QA_TESTING** - QA is testing the implementation
4. **PD_TESTING** - Process owner/submitter is validating
5. **FOR_DEPLOYMENT** - Ready for production deployment
6. **DEPLOYED** - Completed and deployed to production

## Security Considerations

### API Key Management
- **Never commit the API key to version control**
- Store the key securely in environment variables
- Rotate the key periodically (recommended: every 90 days)
- Use HTTPS only - never send the API key over unencrypted connections

### Rate Limiting
Currently, there is no rate limiting implemented. Consider implementing the following:
- Maximum 100 requests per minute
- Maximum 1000 requests per day
- Exponential backoff for failed requests

### IP Whitelisting (Recommended)
For enhanced security, consider restricting access to known SAP server IP addresses:
- Add SAP server IPs to a whitelist
- Reject requests from unknown IP addresses
- Log all access attempts for security auditing

## Monitoring & Logging

### Server Logs
All SAP ticket creations are logged to the server console:
```
SAP ticket created: TKT-2601-0042 (ID: clx1234567890abcdef)
```

Failed authentication attempts are also logged:
```
Unauthorized API access attempt to /api/external/sap/tickets
```

### Database Audit Trail
Each ticket creation generates:
1. **Ticket record** in the `Ticket` table
2. **Status history entry** in the `TicketStatusHistory` table with reason: "Auto-created by SAP integration"

## Troubleshooting

### Common Issues

#### 401 Unauthorized Error
**Cause**: Invalid or missing API key
**Solution**: Verify the `x-api-key` header is present and matches the server's `SAP_API_KEY` environment variable

#### 400 Bad Request - "Validation failed"
**Cause**: Missing or invalid request fields
**Solution**: Ensure all three fields (`sapPayload`, `sapResponse`, `formData`) are present and contain valid JSON objects

#### 404 Not Found - "Submitter user not found"
**Cause**: The configured submitter user ID doesn't exist in the database
**Solution**: Contact system administrator to verify user ID `cmg07ttto0002pb0k2i3w9qcu` exists

#### 500 Internal Server Error
**Cause**: Database connection issues or server errors
**Solution**: Check server logs and database connectivity. Contact system administrator.

## Testing the API

### Test with cURL (Development)

For local development (http://localhost:3001):
```bash
curl -X POST http://localhost:3001/api/external/sap/tickets \
  -H "Content-Type: application/json" \
  -H "x-api-key: eC3AjW2pga1ADq3DeE5PI00m2kx79RzdksDDvz2QPyQ=" \
  -d '{
    "sapPayload": {"test": "payload"},
    "sapResponse": {"error": "test error"},
    "formData": {"user": "test"}
  }'
```

### Expected Success Response
```json
{
  "success": true,
  "ticketNumber": "TKT-2601-0001",
  "ticketId": "clx..."
}
```

## Configuration

### Environment Variables

Add to `.env` or `.env.local`:

```bash
# SAP Integration API Key
SAP_API_KEY=eC3AjW2pga1ADq3DeE5PI00m2kx79RzdksDDvz2QPyQ=
```

### Regenerating the API Key

If you need to regenerate the API key for security reasons:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using OpenSSL
openssl rand -base64 32
```

Update the `.env` file with the new key and inform the SAP team.

## Support & Contact

For issues or questions regarding the SAP Integration API:
- **Technical Support**: Contact PDIS development team
- **Security Issues**: Report immediately to system administrator
- **Feature Requests**: Submit through standard PDIS channels

## Changelog

### Version 1.0.0 (2026-01-03)
- Initial release
- POST endpoint for creating SAP integration tickets
- API key authentication
- Automatic bypass of approval workflow
- Fixed ticket properties (title, category, priority, status)

## Future Enhancements

Planned improvements for future versions:
1. **Notifications**: Email/system notifications when SAP tickets are created
2. **Webhooks**: Callback to SAP when ticket status changes
3. **Rate Limiting**: Implement request throttling to prevent abuse
4. **IP Whitelisting**: Restrict access to known SAP servers
5. **Audit Dashboard**: Dedicated dashboard for monitoring SAP integration metrics
6. **Multiple Integration Support**: Support for other external systems
7. **Attachment Support**: Allow SAP to attach error logs or screenshots

---

**Last Updated**: January 3, 2026
**API Version**: 1.0.0
**Maintained By**: PDIS Development Team
