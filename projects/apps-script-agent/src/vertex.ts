import {
    type GenerateContentRequest,
    type GenerateContentResponse,
    type Content,
    type FunctionCallPart,
} from '@google-cloud/vertexai'

export function generate(
    payload: GenerateContentRequest,
    { MODEL, PROJECT_ID }: { MODEL: string; PROJECT_ID: string }
): GenerateContentResponse {
    const URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${MODEL}:generateContent`
    const options = {
        method: 'post' as const,
        headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
        muteHttpExceptions: true,
        contentType: 'application/json',
        payload: JSON.stringify(camelToSnake(payload)),
    }

    const response = UrlFetchApp.fetch(URL, options)

    if (response.getResponseCode() == 200) {
        return JSON.parse(response.getContentText())
    } else {
        throw new Error(response.getContentText())
    }
}

export function camelToSnake(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj
    if (Array.isArray(obj)) return obj.map(camelToSnake)

    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => {
            const snakeKey = convertKey(key)
            return [
                snakeKey,
                snakeKey === 'function_declarations'
                    ? value
                    : camelToSnake(value),
            ]
        })
    )
}

function convertKey(key: string): string {
    return key.replace(/([A-Z])/g, '_$1').toLowerCase()
}

export function isFunctionCallPart(
    part: Content['parts'][number]
): part is FunctionCallPart {
    return 'functionCall' in part
}
