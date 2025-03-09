import { describe, test, expect } from 'vitest'
import { camelToSnake } from '../src/vertex' // Update the import path

describe('camelToSnake', () => {
    test('should return primitives unchanged', () => {
        expect(camelToSnake(42)).toBe(42)
        expect(camelToSnake('hello')).toBe('hello')
        expect(camelToSnake(true)).toBe(true)
        expect(camelToSnake(null)).toBe(null)
    })

    test('should handle arrays recursively', () => {
        const input = [{ camelCase: 'value' }, { anotherTest: 123 }]
        const expected = [{ camel_case: 'value' }, { another_test: 123 }]
        expect(camelToSnake(input)).toEqual(expected)
    })

    test('should convert simple camelCase keys to snake_case', () => {
        const input = { camelCase: 'value', anotherKey: 456 }
        const expected = { camel_case: 'value', another_key: 456 }
        expect(camelToSnake(input)).toEqual(expected)
    })

    test('should process nested objects recursively', () => {
        const input = {
            innerObj: { nestedCamel: 'test' },
            anotherNested: { keyOne: 1 },
        }
        const expected = {
            inner_obj: { nested_camel: 'test' },
            another_nested: { key_one: 1 },
        }
        expect(camelToSnake(input)).toEqual(expected)
    })

    test('should skip processing values under "function_declarations" key', () => {
        const input = {
            functionDeclarations: { innerCamel: 'shouldNotConvert' },
            normalKey: { shouldProcess: true },
        }
        const expected = {
            function_declarations: { innerCamel: 'shouldNotConvert' }, // Value not processed
            normal_key: { should_process: true }, // Value processed normally
        }
        expect(camelToSnake(input)).toEqual(expected)
    })

    test('should handle empty structures correctly', () => {
        expect(camelToSnake({})).toEqual({})
        expect(camelToSnake([])).toEqual([])
    })

    test('should preserve snake_case keys', () => {
        const input = { already_snake: { nestedKey: 'value' } }
        const expected = { already_snake: { nested_key: 'value' } }
        expect(camelToSnake(input)).toEqual(expected)
    })

    test('should handle keys with numbers', () => {
        const input = { camelCase2Key: 'value' }
        const expected = { camel_case2_key: 'value' }
        expect(camelToSnake(input)).toEqual(expected)
    })
})
