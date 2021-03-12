import _ from 'lodash';

import { Config } from '../config';

export const teams = Config.teams||{};

export interface TEAM {
  city: string;
  team: string,
  full: string,
  league: string;
}

/**
 * getTeamName - get Team from defined list in config by any field
 * 
 * @param lookup Value to lookup 
 * @returns string
 */
export function getTeam(lookup:string) : TEAM {
  // let found = _.find(teams,find=>{
  //   return _.has(find, lookup)
  // });

  // return found as TEAM;
  let test = _.find(teams,team=>_.find(team,(val,key)=>val===lookup)) as TEAM;

  return _.find(teams,team=>_.find(team,(val,key)=>val===lookup)) as TEAM;
}

/**
 * getTeamName - get team name from defined list in config
 * 
 * @param entry Name to lookup 
 * @returns string
 */
export function getTeamName(entry:string) : string {
  // find by key
  let found = teams[entry];
  if (!found) {
    const team = _.values(teams);
    found = _.get(team,'team',entry);

    if (!found) {
      found = _.get(team,'name', entry);
    }

    throw new Error(`Can't find team for ${entry}`);
  }

  return found.team;
}