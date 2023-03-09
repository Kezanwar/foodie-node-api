import { Router } from 'express'
import { parse } from 'node-html-parser' // package for parsing html

import { RUGBY_TABLE_DATA, RUGBY_FULL_LABELS } from './tests.rugbydata.js' // html table data of teams and html data of the long labels above the table

const router = Router()

router.get('/test-rugby', async (req, res) => {
  const totalRows = 7 // how many rows there are (6 teams plus the header / labels row)
  const itemsPerRow = 28 // how many items per row - theres the team name and then 27 stats for each team on each row

  const stats = {} // inititalized an empty stats object
  let labels = [] // initialized an empty array for the labels

  try {
    const root = parse(RUGBY_TABLE_DATA) // chucked the string of HTML table into this parse package from 'node-html-parser' package
    const arrOfValues = root.removeWhitespace().text.split(' ') // called removeWhiteSpace method to lose all white spaces in text, then got the text and called split method on the string by " " which is a space, so weve now got an array of every word in the table

    // here i use a for loop

    for (let i = 0; i <= totalRows; i++) {
      // for loop will run whilst this expression is true, so whilst i is smaller or equal to the number of rows we run, and i should be incremented by 1 each time it ends, thats what ++ means

      let start = 0 // inialize a start value
      let thisRow = arrOfValues.splice(start, itemsPerRow) // splice is a method used on an array that lets take a specific segment of an array and stick it in a new array takes 2 arguments, a point in the array to start from and how many items to take with you - we tell it to start at 0 and get the first 28 values and make a new array from them

      let key = thisRow[0] // the first item in the array is the first item in the, row it is either 'Teams' or the team name

      // everything in this section now before the if statements below is gonna change each loop - so on the next loop start will become 28, and thisRow will then become a different segment of the array because the change in start (effectively the next row down in the table) and this will increment again in the same fashion on each loop

      if (i === 0) {
        // this code runs on the first while loop
        // if we are on the first loop then 'thisRow' will be the HEADERS (Labels row) which has the label for each column, but we need to get the long version of the labels to make the data prettier and more readable, rather than the short labels

        const fullLabels = parse(RUGBY_FULL_LABELS).removeWhitespace().text // I use the same method as above to parse the column labels, i took the HTML from the webpage, but i dont split them into an array of individual words at this point, as the label data is laid out differently so we need a different approach - this is just a string with all the text from the label keys element above the table
        labels = thisRow.map((smallLabel, index) => {
          // here we are using .map on 'thisRrow' of the table small labels for each column, its essentially a for loop under the hood that returns a new array and whats returns in each loop is the item in the new array. .map has each item in the array as an argument along with the index, iv called the item in the loop 'smallLabel' -  and the result of it will replace 'labels' we intialized above

          if (index === 0)
            return 'Team' // the first label is 'Teams' in the table header, im just changing it to 'Team' because its gonna exist in each teams object now so plural doesnt make sense - this return here means we go into the next map loop
          else {
            // now the index isn't 0 anymore, so we are past teams now, its trys, try assits and so on from here omwards in this map loop

            const indexOfSmalllabel = fullLabels.indexOf(smallLabel) // here we find the index of character in the fullLabels string

            let arrayOfStringsWithFullLabel = fullLabels.substring(indexOfSmalllabel).split(' - ')[1].split(' ') // here i use the index above to give the fullLabels string but only from the index we found above, then i split it by ' - ' and that gives me an array like ['Try', 'Assists', 'C'], so its got the shortened label from the next header item in it which we need to remove

            const isUpperCase = (string) => /^[A-Z]*$/.test(string) //* UPDATE ----- still getting label issues where other shortened labels were appearing in the label, now instead of remving the last item, im checking just if the string is uppercase using this Regex and removing it, thus effectively only leaving the lowercase full label name

            return arrayOfStringsWithFullLabel
              .filter((str) => !isUpperCase(str) && str !== 'Kon' && str !== 'BTs')
              .join('_') // .join is the opposite of .split, it joins them back up with a separator, so i pass in a _ to make it like Try_Assists now and return it.
          }
          // effectively here, weve looped through the row of short labels and found the corresponding long label from the table above and one by one pumped them into the 'labels' array that we intialized at the start
        })
        // END of top row now
      } else if (i !== 0) {
        // this code runs after the first row as 'i' is not equal to 0 any more, if its not the top thisRow its now into TEAMS, so thisRow now is an array of values for france then it will be scotland etc etc
        // so we just simply map the row (a for loop essentially) of table values for that team and return an object for each value
        let teamStats = thisRow.map((item, index) => {
          return {
            label: labels[index] ?? '', // the first item in the object is the label, now in the first loop that happened the code above ran, which populated the labels array we initialized with the correct long labels we need for each column in the table. So we use the index of the item we are at in thisRow of values for the team and use it to find the corresponding label in the labels array we made above, thats what labels[index] does, it takes the index of this particular map loop and finds the corresponding value in the labels array, the ?? "" is just a fallback, if it doesnt exist give me an empty string as if we didnt handle that the program would break
            value: item, // the value in this object is just the actual value nothing changed
          }
        })

        // right so remember above we made an empty object for the stats and we took the key that we want, which is the first item in each 'thisRow' so it would be Team, France, Scotland, Italy..... etc
        // now at the end of each for loop we wanna populate the empty stats object with the data we just created,

        stats[key] = teamStats.reduce((obj, item) => Object.assign(obj, { [item.label]: item.value }), {}) // we are adding a key value pair into he stats object here, stats[key] means we wanna add like scotland as the key, then what is equal to so after the = currently team stats is an array of objects for each stat, but we just want one object with all the stats in, so thats what im doin there, im taking the array of objects and reducing them down into one big object of team data, no weve applied the data to that key / team with the correct label and value paired up for each statistic
      }
      // weve come to the end of our for loop
      start = start + totalRows // ok so here, its kind of like the last part of the for loop expression where "i" is gonna increment by one, at the end o the for loop we also want the start value to increment by total number of rows, so the when the next loop starts it be 28 and can be used to capture the next segment of values which will be the next teams values
    }
    const filteredStats = Object.entries(stats).filter(([key, value]) => key !== 'undefined') // so now the loop has ran, we ended up with a random object that had udnefined as the name of the key, think its something to do with the teams value or some random text in there too, so i just conver the object back to an array and filter it out
    const finalCleanedDataToReturn = Object.fromEntries(filteredStats) // then i convert the array back to an object

    res.json(finalCleanedDataToReturn) // returning the data back to whover requested it from my api
  } catch (error) {
    console.log(error)
    res.status(500).send(error?.response || 'Unexpected error')
  }
})

export default router
