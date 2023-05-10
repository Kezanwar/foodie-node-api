/* eslint-disable no-undef */
// A date string format is yyyy-mm-dd

import { isDatePast, isoToDateNumbers, isoToDateText } from './date.services'

test('parse iso string to dd-MM-yyyy', () => {
  const isoSat6thMay = '2023-05-06T00:00:00.000Z'
  expect(isoToDateNumbers(isoSat6thMay)).toBe('06-05-2023')
})

test('parse iso string to text date', () => {
  const isoSat6thMay = '2023-05-06T00:00:00.000Z'
  expect(isoToDateText(isoSat6thMay)).toBe('Sat 6th May 2023')
})

test('future iso date isnt in the past', () => {
  const futureIso = new Date('2024-05-05')
  expect(isDatePast(futureIso)).toBe(false)
})

test('today iso date isnt in the past', () => {
  const todayIso = new Date().toISOString()
  expect(isDatePast(todayIso)).toBe(false)
})

test('past iso date is in the past', () => {
  const pastIso = new Date('2022-05-05').toISOString()
  expect(isDatePast(pastIso)).toBe(true)
})
