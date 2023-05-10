/* eslint-disable no-undef */
describe('Match email', () => {
  const stringToTest = 'KEZanwar+1@gmail.com'
  const result = 'kezanwar+1@gmail.com'
  it('return true ', () => expect(stringToTest.toLowerCase()).toBe(result))
})
