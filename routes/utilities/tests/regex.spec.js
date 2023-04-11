/* eslint-disable no-undef */
import { matchAllCases } from '../regex'

describe('matchAllCases with uppercase', () => {
  const stringToTest = 'kezanwAr@gmail.com'
  const stringToMatch = 'kezanwar@gmail.com'
  it('return true for uppercase and number ', () => expect(stringToTest).toMatch(matchAllCases(stringToMatch)))
})
