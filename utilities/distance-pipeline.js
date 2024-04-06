//https://stackoverflow.com/questions/18883601/function-to-calculate-distance-between-two-coordinates

const METER_TO_MILE_CONVERSION = 0.00062137
const r = 6371 // km
const p = Math.PI / 180

export const calculateDistancePipeline = (LAT, LONG, coordinatesPath, newDistanceField) => {
  return [
    {
      $addFields: {
        dLon: {
          //dLon = (lon2-lon1) * Math.PI / 180
          $multiply: [
            {
              $subtract: [
                {
                  $arrayElemAt: [`${coordinatesPath}`, 0],
                },
                LONG,
              ],
            },
            p,
          ],
        },
        dLat: {
          //dLat = (lat2-lat1) * Math.PI / 180
          $multiply: [
            {
              $subtract: [
                {
                  $arrayElemAt: [`${coordinatesPath}`, 1],
                },
                LAT,
              ],
            },
            p,
          ],
        },
      },
    },
    {
      $addFields: {
        a1: {
          // Math.sin(dLat/2) * Math.sin(dLat/2)
          $multiply: [{ $sin: { $divide: ['$dLat', 2] } }, { $sin: { $divide: ['$dLat', 2] } }],
        },
        a2: {
          //Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2)
          $multiply: [
            {
              $cos: {
                $multiply: [{ $multiply: [LAT, p] }],
              },
            },
            {
              $cos: {
                $multiply: [
                  {
                    $multiply: [
                      {
                        $arrayElemAt: [`${coordinatesPath}`, 1],
                      },
                      p,
                    ],
                  },
                ],
              },
            },
            { $sin: { $divide: ['$dLon', 2] } },
            { $sin: { $divide: ['$dLon', 2] } },
          ],
        },
      },
    },
    //a3 = a1 + a2
    {
      $addFields: {
        a3: { $add: ['$a1', '$a2'] },
      },
    },
    //c = 2 * Math.atan2(Math.sqrt(a3), Math.sqrt(1-a3));
    {
      $addFields: {
        c: {
          $multiply: [
            2,
            {
              $atan2: [{ $sqrt: '$a3' }, { $sqrt: { $subtract: [1, '$a3'] } }],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        [newDistanceField]: {
          $multiply: [{ $multiply: [{ $multiply: [r, '$c'] }, 1000] }, METER_TO_MILE_CONVERSION],
        },
      },
    },
  ]
}
