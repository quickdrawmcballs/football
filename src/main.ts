import _ from 'lodash';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { Logger } from './logging';
import { doOdds } from './oddsEngine';
import { doSeason } from './statsEngine';
import { dfdTest, train } from './mlEngine';

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

  if (_.isEqual(mode,'odds')) {
    let refresh = (/true/i).test(String(_.get(argv,'refresh')));
    Logger.info(`Running odds... Refresh:${refresh}`);
    doOdds(refresh);
  }
  else if (_.isEqual(mode,'season')) {
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