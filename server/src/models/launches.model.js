const axios = require('axios');

const launchesModel = require('./launches.mongo');
const planetsModel = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 100;


// Third part api call

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query'

async function populateLaunches() { 
    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            pagination: false,
            populate: [
                {
                    path: 'rocket',
                    select:{
                        name:1
                    }
                },
                {
                    path: 'payloads',
                    select:{
                        'customers':1
                    }
                }
            ]
        }
      })

      if(response.status != 200){
        console.log(`Problem downloading launch data`)
        throw new Error('Launch data download failed!')
     }
    
      const launchDocs = response.data.docs;
      
      for(const launchDoc of launchDocs){
      
        const payloads = launchDoc['payloads'];
        const customers = payloads.flatMap((payload) => {
            return payload['customers'];
        })
      
        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: launchDoc['rocket']['name'],
            launchDate: launchDoc['date_local'],
            upcoming: launchDoc['upcoming'],
            success: launchDoc['success'],
            customers: customers,
        }
        console.log(`${launch.flightNumber} ${launch.mission}`)
        
        saveLaunch(launch)
    
    }
 }


async function loadLaunchData() { 

  const firstLaunch =  await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat',
    })

    if(firstLaunch){
        console.log(`Launch data is already loaded!`)
    }else{
       await populateLaunches();
    }


 

 }

 async function findLaunch(filter) { 
    return await launchesModel.findOne(filter);
  }


async function existsLaunchWithId(launchId) { 
    return await findLaunch({flightNumber: launchId});
 }

 async function getLatestFlightNumber(){
        const latestLaunch = await launchesModel.findOne().sort('-flightNumber')
        
        if(!latestLaunch){
            return  DEFAULT_FLIGHT_NUMBER;
        }
        
        return latestLaunch.flightNumber;
    }

async function getAllLaunches(skip, limit){
    return await launchesModel
    .find({}, {'_id': 0, '__v': 0 })
    .sort({ flightNumber: 1 })
    .skip(skip)
    .limit(limit)
}

async function saveLaunch(launch){
       
        
       await launchesModel.findOneAndUpdate({
            flightNumber: launch.flightNumber,
        }, launch, {upsert: true})
        
       
    
}

async function scheduleNewLaunch(launch) { 

        const planet = await planetsModel.findOne({
            keplerName: launch.target,
        });

        if(!planet){
            throw new Error('No matching planet found')
        }
  
    const newFlightNumber = await getLatestFlightNumber() + 1;
  
    const newLaunch = Object.assign(launch, {
        success: true,
        upcoming: true,
        customers: ['Space X', 'NASA'],
        flightNumber: newFlightNumber,
    });

    await saveLaunch(newLaunch);

 }


async function abortLaunchById(launchId) { 
    const aborted =  await launchesModel.updateOne({
        flightNumber: launchId,
    }, {
        upcoming: false,
        success: false,
    })
    
    // return aborted.ok === 1 && aborted.nModified === 1;
    return aborted.modifiedCount === 1;
 }

module.exports = {
    getAllLaunches, existsLaunchWithId, abortLaunchById, scheduleNewLaunch, loadLaunchData
}