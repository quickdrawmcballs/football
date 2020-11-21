import _ from 'lodash';

import { Config } from '../config';

export const teams = Config.teams||{};

export function getTeam(entry:string) : string {
  // find by key
  let found = teams[entry];
  if (!found) {
    const nflTeams = _.values(teams);
    found = _.get(nflTeams,'team',entry);

    if (!found) {
      found = _.get(nflTeams,'name', entry);
    }

    throw new Error(`Can't find team for ${entry}`);
  }

  return found.team;
}