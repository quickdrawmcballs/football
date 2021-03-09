import _ from 'lodash';

import { Logger } from '../logging';
import { getTeam } from '../utils/teams';
import { convertToCsv, createDatedFileName, outputToFile, readFromFile } from '../utils/output';
import { sleep } from '../utils/utils';

import { getSchedule, getGameBoxScore } from './sportRadar';
import { csv } from 'd3';

const AWAIT_REQUEST_MS = 1000;

interface Team {
  id: string;
  name: string;
  alias: string
}

interface Scoring_Period {
  id: string;
  number:string;
  away_points: number;
  home_points: number; 
  period_type: string;
}

interface Game {
  id: string;
  date: string;
  home_team: Team;
  away_team: Team;
  home_points: number;
  away_points: number;
  // scoring: Scoring;
  boxScore: BoxScore;
  venue: Venue;
}

interface Scoring {
  away_points: number;
  home_points: number;
  period: Scoring_Period[];
}

interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface BoxScore {}


const fields = [
  {
    value:'week'
  },
  {
    value:'id'
  },
  {
    value:'scheduled'
  },
  {
    label:'home_team',
    value:'home_team'
  },
  {
    label:'away_team',
    value:'away_team'
  },
  {
    label:'home_points',
    value:'scoring.home_points'
  },
  {
    label:'away_points',
    value:'scoring.away_points'
  },
  {
    label:'home_total_rushing_yards',
    value:'home_total_rushing_yards'
  },
  {
    label:'away_total_rushing_yards',
    value:'away_total_rushing_yards'
  },
  {
    label:'home_total_passing_yards',
    value:'home_total_passing_yards'
  },
  {
    label:'away_total_passing_yards',
    value:'away_total_passing_yards'
  }
]

const transform = (entry:any) => {
  try {
    entry.home_team = getTeam(entry.home.name);
    entry.away_team = getTeam(entry.away.name);

  }
  catch (err) {
    Logger.error(err.toString());
  }

  return entry;
};

export async function doSeason(refresh?:boolean) : Promise<any> {
  try {
    let games:Game[] = await _getSchedule(refresh);

    // get played games
    games = _.filter(games,['status','closed']);

    await sleep(AWAIT_REQUEST_MS);
    Logger.info(`Retreiving ${games.length} stats. Each request will wait ${AWAIT_REQUEST_MS/1000}s, this could take a while.`)
    let boxScores:any[] = [];
    for (let i = 0; i < games.length; i++) {
      let game = games[i];
      let game_stats:any = await _getOrCreateFile('./output/game_stats/nba/' + game.id, async ()=>{
        let stats = await getGameBoxScore(game.id);
        await sleep(AWAIT_REQUEST_MS);
        return stats;
      });
      boxScores.push(_.merge(game,{game_stats}));
    }

    let csv:string = _convertToCSV([]);

    return {
      csv,
      json: boxScores
    }
  }
  catch(err) {
    Logger.error(err.toString());
  }
}

function _convertToCSV(boxScores:any[]) : string {
    // let csv:string = convertToCsv(boxScores,{fields,transforms:[transform]})

    // if (csv!=='') {
    //   Logger.debug(`Creating csv file from this week's odds`);
    //   // create the odds file
    //   await outputToFile(createDatedFileName('season.csv'),csv);
    //   Logger.info(`Created Season Results successful`);
    // }

    return '';
}

async function _getSchedule(refresh:boolean=false) : Promise<any> {
  let seasonData:any;
  try {
    seasonData = refresh ? undefined : JSON.parse( await readFromFile('./seasonData.json'));
  }
  catch (err) {
    Logger.error(err.toString());
    seasonData = undefined;
  }  
  if (!seasonData) {
    let resp = await getSchedule();

    seasonData = _.get(resp,'data',[]);

    // write the json to file
    await outputToFile('./seasonData2020.json',JSON.stringify(seasonData));
  }

  return seasonData;
}

async function _getGameStats(gameId:string) : Promise<any> {
  // look locally
  let gameData:any;
  try {
    gameData = await readFromFile('./output/game_stats/' + gameId);
  } catch (err) {
    Logger.error(err.toString());
    gameData = undefined;
  }
  if (!gameData) {
    let resp = await getGameBoxScore(gameId);

    gameData = _.get(resp,'data',{});

    await outputToFile('./output/nba/game_stats/' + gameId,JSON.stringify(gameData));
  }

  return gameData;
}

type RetrieveFunction = (...args: any) => Promise<any>;
async function _getOrCreateFile(filePath:string,retrieve:RetrieveFunction) : Promise<any> {
  let retVal:any;
  try {
    let data = await readFromFile(filePath);
    if (data) {
      retVal = JSON.parse(data);
    }
  }
  catch (err) {
    Logger.error(err.toString());
    retVal = undefined;
  }
  if (!retVal) {
    let resp = await retrieve();

    retVal = _.get(resp,'data',{});

    await outputToFile(filePath,JSON.stringify(retVal));
  }

  return retVal;
}