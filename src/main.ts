import _ from 'lodash';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { Logger } from './logging';
import { doOdds } from './oddsEngine';
import { doSeason } from './statsEngine';
import { dfdTest, train } from './mlEngine';
import { iSportType } from './utils/interfaces';

import { doOdds as NBAOdds } from './nba/oddsEngine';

const argv = yargs(hideBin(process.argv)).argv;
const dateFormat = 'MM/D h:mm A';

interface Game {
  date: string;
  home_team: string;
  away_team: string;
  odds_source?: string;
  odds_last_update?: string;
  odds_spread?: string;
  odds_vig?: string;
}

async function run() {
  let mode = _.get(argv,['_','0']);

  if (_.isEqual(mode,'nfl_odds')) {
    let refresh = (/true/i).test(String(_.get(argv,'refresh')));
    Logger.info(`Running NFL odds... Refresh:${refresh}`);
    doOdds({sport:'americanfootball_nfl',display:'nfl'},refresh);
  }
  else if (_.isEqual(mode,'nba_odds')) {
    let refresh = (/true/i).test(String(_.get(argv,'refresh')));
    Logger.info(`Running NBA odds... Refresh:${refresh}`);
    doOdds({sport:'basketball_nba',display:'nba'},refresh);
  }
  else if (_.isEqual(mode,'season')) {
    let refresh = (/true/i).test(String(_.get(argv,'refresh')));
    Logger.info(`Running season... Refresh:${refresh}`);
    doSeason(refresh);
  }
  else if (_.isEqual(mode,'nba_season')) {
    let refresh = (/true/i).test(String(_.get(argv,'refresh')));
    Logger.info(`Running season... Refresh:${refresh}`);
    doSeason(refresh);
  }
  else if (_.isEqual(mode,'dfd')) {
    Logger.info(`Tensor Flow...`);
    dfdTest();
    // train();
  }
  else {
    Logger.warn(`No mode is set. Exiting`);
  }

  // console.log('----------------- hello world --------------');
  // await get_model();
  // console.log('----------------- model created --------------');

  // dfdTest();
  // train();
}

run();