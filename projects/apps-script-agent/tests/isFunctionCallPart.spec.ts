import { describe, expect, expectTypeOf, it } from 'vitest'
import { isFunctionCallPart } from '../src/vertex' // Update the import path
import { type Content, type FunctionCallPart } from '@google-cloud/vertexai'

describe('isFunctionCallPart', () => {
    it('returns true for FunctionCallPart', () => {
        const functionCallPart: Content['parts'][number] = {
            functionCall: { name: 'test', args: {} },
        } as FunctionCallPart

        expect(isFunctionCallPart(functionCallPart)).toBe(true)
    })

    it('returns false for non-FunctionCallPart', () => {
        const textPart: Content['parts'][number] = {
            text: 'hello world',
        }

        expect(isFunctionCallPart(textPart)).toBe(false)
    })

    it('correctly narrows type in TypeScript', () => {
        const validPart = { functionCall: { name: 'test', args: {} } }
        const invalidPart = { text: 'test' }

        // Test type narrowing
        if (isFunctionCallPart(validPart)) {
            expectTypeOf(validPart).toMatchTypeOf<FunctionCallPart>()
        }

        if (!isFunctionCallPart(invalidPart)) {
            expectTypeOf(invalidPart).not.toMatchTypeOf<FunctionCallPart>()
        }
    })

    it('returns false for empty object', () => {
        const emptyPart = {}
        expect(isFunctionCallPart(emptyPart)).toBe(false)
    })
})
