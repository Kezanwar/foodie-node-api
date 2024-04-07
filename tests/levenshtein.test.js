import levenshtein from '#app/utilities/levenshtein.js'

/* eslint-disable no-undef */
describe('levenshtein', () => {
  it('it should return 0.75 for a single word that is a length of 4 (needle) matching a paragraph with a matching word that is one edit away (haystack) ', () => {
    const needle = 'Ben'
    const haystack =
      'Banag ipsum dolor amet  drumstick. 2 for 1 bresaola  t-bone jowl tri-tip chuck sirloin. Frankfurter chuck cow, sausage t-bone strip steak shankle Bens round andouille pork loin porchetta boudin. Picanha shoulder sirloin venison shankle '
    const result = levenshtein(needle, haystack)
    expect(result).toBe(0.75)
  })
  it('it should return 0.25 for a single word that is a length of 4 (needle) matching a sentence with a matching word that is 3 edits away (haystack) ', () => {
    const needle = 'Bens'
    const haystack = 'AA ipsum dolor amet B'
    const result = levenshtein(needle, haystack)
    expect(result).toBe(0.25)
  })
  it('it should return 0 for a single word that is a length of 5 (needle) matching a sentence with no matching word ', () => {
    const needle = 'Bens'
    const haystack = 'AA ipsum dolor amet P'
    const result = levenshtein(needle, haystack)
    expect(result).toBe(0)
  })
})
