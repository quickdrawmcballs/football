import axios, { AxiosRequestConfig } from 'axios';
import _ from 'lodash';

import { Config } from './config';
import { Logger } from './logging';

const preURL = "https://api.the-odds-api.com/v3/odds/";
const sport = "americanfootball_nfl";
// const apiKey:string = Config.theOddsApi.apiKey;
// const region = "us";
// const mkt="spreads";

const example = "GET /v3/odds/?sport={sport}&region={region}&mkt={mkt}&apiKey={apiKey}&dateFormat={iso}&oddsFormat={american}";
const real_example = "GET /v3/odds/?apiKey={e0d683c85101317f19092fa48f290ec9}&sport={americanfootball_nfl}&region={us}&mkt={spreads}";

const Markets = _.keyBy(['spreads'],key=>key);

export const getOddsSpread = () => request(preURL,buildOddsRequest(Markets.spreads));

function buildOddsRequest(mkt:string=Markets.spreads): any {
  let test = Config.theOddsApi;
  return _.merge({},Config.theOddsApi,{
    sport,
    mkt
  });
}

async function request(url:string,params:any) : Promise<any> {
  let requestConfig:AxiosRequestConfig = {
    method: 'GET',
    url,
    params
  };

  try {
    Logger.info(`Attempting GET: ${url}`);
    let resp = await axios(requestConfig);
    // Check your usage
    Logger.info(`Remaining requests ${resp.headers['x-requests-remaining']}`);
    Logger.info(`Used requests ${resp.headers['x-requests-used']}`);

    return resp;
  } catch (err) {
    Logger.error(`${url} has failed. ${err.toString()}`);
  }
}