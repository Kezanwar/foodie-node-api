/* eslint-disable no-undef */

import { ValidURL, createUrlFromLink, hasHttp } from '../url.js'

describe('ValidURL', () => {
  test('should return true for a valid URL', () => {
    const validUrls = [
      'http://example.com',
      'https://www.example.com',
      'https://subdomain.example.com',
      'http://example.com/path/to/page.html',
      'https://www.example.com/path/to/page.html?id=123',
      'http://example.com:8080',
      'https://www.example.com:8080',
      'http://example.com:8080/path/to/page.html',
      'https://www.example.com:8080/path/to/page.html?id=123',
    ]

    validUrls.forEach((url) => {
      expect(ValidURL(url)).toBe(true)
    })
  })

  test('should return false for an invalid URL', () => {
    const invalidUrls = [
      'example.com',
      'www.example.com',
      'example.com/path/to/page.html',
      'www.example.com/path/to/page.html?id=123',
      'http:/example.com',
      'https:/www.example.com',
      'http//example.com',
      'https//www.example.com',
    ]

    invalidUrls.forEach((url) => {
      expect(ValidURL(url)).toBe(false)
    })
  })
})

describe('hasHttp function', () => {
  test('returns true if a string contains http', () => {
    const result = hasHttp('http://www.google.com')
    expect(result).toBe(true)
  })

  test('returns false if a string does not contain http', () => {
    const result = hasHttp('www.google.com')
    expect(result).toBe(false)
  })

  test('returns true if a string contains https', () => {
    const result = hasHttp('https://www.google.com')
    expect(result).toBe(true)
  })
})

describe('createUrlFromLink', () => {
  it('should add https:// to a link without http', () => {
    const input = 'www.google.com'
    const expectedOutput = 'https://www.google.com'
    const result = createUrlFromLink(input)
    expect(result).toEqual(expectedOutput)
  })

  it('should not modify a link with http', () => {
    const input = 'http://www.google.com'
    const expectedOutput = 'http://www.google.com'
    const result = createUrlFromLink(input)
    expect(result).toEqual(expectedOutput)
  })
})
