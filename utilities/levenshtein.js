//* Levenshtein String Similarity
//* stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely

export const stringSimilarity = (s1, s2) => {
  let longer = s1
  let shorter = s2
  if (s1.length < s2.length) {
    longer = s2
    shorter = s1
  }
  const longerLength = longer.length
  if (longerLength === 0) {
    return 1.0
  }
  return (longerLength - calcEditDistance(longer, shorter)) / parseFloat(longerLength)
}

function calcEditDistance(s1, s2) {
  s1 = s1.toLowerCase()
  s2 = s2.toLowerCase()

  const costs = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j
      else {
        if (j > 0) {
          let newValue = costs[j - 1]
          if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
          costs[j - 1] = lastValue
          lastValue = newValue
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  return costs[s2.length]
}

//* needle: string (single word)
//* haystack: string (multi word)
export const getStringSimilaritySingleWord = (needle, haystack) => {
  return haystack.split(' ').reduce((acc, curr) => {
    const calc = stringSimilarity(needle, curr)

    if (acc < calc) {
      acc = calc
    }

    return acc
  }, 0)
}

//* needle: string OR array (single world OR multi word)
//* haystack: string (multi word)
export const getStringSimilarity = (needle, haystack) => {
  const needleLength = needle.split(' ').length

  if (needleLength === 1) {
    return getStringSimilaritySingleWord(needle, haystack)
  }

  const haySplit = haystack.split(' ')

  const haySplitLength = haySplit.length

  let similarity = 0

  for (let i = 0; i <= haySplitLength; i++) {
    const phraseMatch = stringSimilarity(needle, haySplit.slice(i, i + needleLength).join(' '))
    if (similarity < phraseMatch) {
      similarity = phraseMatch
    }
  }

  return similarity
}

export const testLevenshstein = () => {
  const needle = 'banana for kez'
  const haystack =
    'Banag ipsum dolor amet pancetta shankle sirloin jerky pork drumstick. 2 for 1 bresaola chicken pastrami shank landjaeger pork chop t-bone jowl tri-tip chuck sirloin. Frankfurter chuck cow, sausage t-bone strip steak shankle ground round andouille pork loin porchetta boudin. Picanha shoulder sirloin venison shankle biltong fatback porchetta pastrami NBananapork chop ground round drumstick kevin. Ham chuck pork loin salami shank hamburger ball tip pork chop cupim, ground round boudin turducken. Sausage pork chop buffalo boudin, grey frankfurter meatball burgdoggen tail pork belly jowl porchetta prosciutto doner. Ball tip cupim landjaeger shankle tail buffalo meatloaf turducken.'
  console.log(getStringSimilarity(needle, haystack))
}
