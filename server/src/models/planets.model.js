// const planets = [];

const fs = require('fs');
const path = require('path');
const {parse} = require('csv-parse');

const planets = require('./planets.mongo');

// const habitablePlanets = [];

function isHabitablePlanet(planet){
    return planet['koi_disposition'] === 'CONFIRMED'
        && planet['koi_insol'] > 0.36 && planet['koi_insol'] < 1.11
        && planet['koi_prad'] < 1.6
}

function loadPlanetsData(){
  return new Promise((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '..', '..', 'data', 'kepler_data.csv'))
    .pipe(parse({
        comment: '#',
        columns: true,
    }))
    .on('data', async (data)=>{
        if(isHabitablePlanet(data)){
            // habitablePlanets.push(data);
           await savePlanet(data);
        }
    })
    .on('error', (err)=>{
        results.push(err)
        reject(err);
    })
    .on('end', async ()=>{
        // console.log(
        //     habitablePlanets.map((planet)=>{
        //         return planet['kepler_name'];
        //     })
        // )
        const countPlanetFound = (await getAllPlanets()).length
        console.log(`${countPlanetFound} Habitable planets found`)
        resolve();
    })
  });
    
}


async function getAllPlanets(){
    return await planets.find({});
}

async function savePlanet(planet){
   try {
        await  planets.updateOne({
            keplerName: planet.kepler_name,
        }, {
            keplerName: planet.kepler_name,
        },{
            upsert: true,
        });
   } catch (error) {
        console.log(`Could not save planet ${error}`)
   }
}


module.exports = {
    loadPlanetsData,
    getAllPlanets
};
