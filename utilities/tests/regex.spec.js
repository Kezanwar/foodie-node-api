/* eslint-disable no-undef */
import { matchAllCases, matchesDateString } from '../regex'

describe('matchAllCases with uppercase', () => {
  const stringToTest = 'kezanwAr@gmail.com'
  const stringToMatch = 'kezanwar@gmail.com'
  it('return true for uppercase and number ', () => expect(stringToTest).toMatch(matchAllCases(stringToMatch)))
})

// date string

describe('match date string format yyyy-mm-dd', () => {
  it('returns true for matching a datestring', () => expect(matchesDateString('1974-06-02')).toBe(true))
  it('returns true for matching a datestring', () => expect(matchesDateString('1974-06-2')).toBe(true))
  it('returns false for matching a datestring', () => expect(matchesDateString('1974--02')).toBe(false))
  it('returns false for matching a datestring', () => expect(matchesDateString('1974--02--')).toBe(false))
})
