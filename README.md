## Description
Football ML Predictor and Odds Retriever

## Getting Started
Run npm install. This will run TS compiler
* `npm install`

Sign up for accounts (I use the free ones)
* [sportrader](https://sportradar.us/)
* [the-odds-api](https://the-odds-api.com/)

Create a debug.json under the config directory and add your keys as such:
```
{
  "sportRadar": {
    "nfl_api": "your_key"
  },
  "theOddsApi":{
    "api_key":"your_key"
  }
}
```
### TensforFlow
You may have to locally compile TensorFlow to work with your CPU. In addition, for better GPU usage, read thier compiler options

## Compiling the Code
After making any changes, you need to run TS compiler from command line
* `tsc`

or

* `npm run build`

or better yet

* `tsc --watch`


## CLI
Run odds retreiver
* `npm run main -- nfl_odds --refresh=true`
* `npm run main -- nba_odds --refresh=true`

Run season schedule results retreiver
* `npm run main -- nfl_season --refresh=true`
* `npm run main -- nba_season --refresh=true`

Run ML predictor (only setup for NFL currently)
* `npm run main -- dfd`

## Output
Output for Odds and Season Results are placed under output. Individual games stats will be placed under output/game_stats. To save account requests, only games that can't be found in this directory will be retrieved

Output for predictions are currently written to console. 

## Usage
Odds are not used in predictor, only season results. Season results must be ran before predictor.

## Troubleshooting
#### Tensforflow
* Their instructions `https://www.tensorflow.org/install`
* Ensure you have windows-build-tools installed `npm install --g --production windows-build-tools`.
  * Should install Ptyhon 2.X (as of the time of writing this is the only way to build Tensorflow.js)
* Install Python 2.X (currently 3.X won't build tensorflow)
* NPM will need NODE-GYP `npm install -g node-gyp`
* Building from code instructions `https://github.com/nodejs/node-gyp#on-windows`
* Other issues: https://github.com/tensorflow/tfjs/issues/4257