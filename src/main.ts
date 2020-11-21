import _ from 'lodash';
import * as dfd from 'danfojs-node';
import * as tf from '@tensorflow/tfjs-node';

import { Logger } from './logging';
import { getSchedule, getWeeklySchedule } from './sportRadar';
import { getOddsSpread } from './sportsOdds';
import { createDatedFileName, outputToFile } from './utils/output';
import { doOdds } from './oddsEngine';
import { doSeason } from './statsEngine';
import { formatFloat } from './utils/utils';
import { teams } from './utils/teams';

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
  // doOdds(true);

  // getSchedule().then(resp=>{
  //   let i = 1;
  // });
  // doSeason();

// function outputToFile(filePath:string,data:any) {
//   return new Promise((resolve,reject)=>writeFile(filePath,data,err=>{
//     if (err) reject(err); else resolve(true);
//   }));
// };

  // console.log('----------------- hello world --------------');
  // await get_model();
  // console.log('----------------- model created --------------');

  // dfdTest();
  // train();
}

async function load_process_data() {
  let df = await dfd.read_csv("delete/titanic.csv")

  //A feature engineering: Extract all titles from names columns
  let title = df['Name'].apply((x:any) => { return x.split(".")[0] }).values
  //replace in df
  df.addColumn({ column: "Name", value: title })

  //label Encode Name feature
  let encoder = new dfd.LabelEncoder()
  let cols = ["Sex", "Name"]
  cols.forEach(col => {
      encoder.fit(df[col])
      let enc_val = encoder.transform(df[col])
      df.addColumn({ column: col, value: enc_val })
  })

  let Xtrain,ytrain;
  Xtrain = df.iloc({ columns: [`1:`] })
  ytrain = df['Survived']

  // Xtrain.head().print();

  // Standardize the data with MinMaxScaler
  let scaler = new dfd.MinMaxScaler()
  scaler.fit(Xtrain)
  Xtrain = scaler.transform(Xtrain)

  // Xtrain.head().print();

  return [Xtrain.tensor, ytrain.tensor] //return the data as tensors
}

async function get_model() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [7], units: 124, activation: 'relu', kernelInitializer: 'leCunNormal' }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.summary();
  return model;
}

async function train() {
  const model = await get_model()
  const data = await load_process_data()
  const Xtrain = data[0]
  const ytrain = data[1]

  model.compile({
      optimizer: "rmsprop",
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
  });

  console.log("Training started....")
  try {
    await model.fit(Xtrain, ytrain,{
        batchSize: 32,
        epochs: 15,
        validationSplit: 0.2,
        callbacks:{
            onEpochEnd: async(epoch:any, logs:any)=>{
              console.log(`EPOCH (${epoch + 1}): Train Accuracy: ${(logs.acc * 100).toFixed(2)},Val Accuracy:  ${(logs.val_acc * 100).toFixed(2)}\n`);
            }
        }
    });
  } 
  catch (err) {
    console.error(err);
  }
}


async function dfdTest() {
  // let df = await dfd.read_csv('https://web.stanford.edu/class/archive/cs/cs109/cs109.1166/stuff/titanic.csv');
  let df = await dfd.read_csv('./output/20201110-174927_season.csv');
  
  // add total_points column
  df.addColumn({column:'total_points',value:df.home_points.add(df.away_points)});
  df.addColumn({column:'home_diff',value:df.home_points.sub(df.away_points)});
  df.addColumn({column:'away_diff',value:df.away_points.sub(df.home_points)});
  df.addColumn({column:'ftr',value:df.home_diff.map((val:number)=>{
    if (val>0) {
      return 'H';
    }
    else if (val<0) {
      return 'A';
    }
    else {
      return 'D';
    }
  })});

  // process all labeled columns
  let encoder = new dfd.LabelEncoder();
  let name_cols = ['home_team','away_team'];
  encoder.fit(_.map(teams,'team'));
  let encoded_names = encoder.label;
  name_cols.forEach(col => df.addColumn({ column: col+'_norm', value: encoder.transform(df[col]) }));

  encoder.fit(df.ftr);
  let encoded_ftr = encoder.label;
  df.addColumn({ column: 'ftr_norm', value: encoder.transform(df.ftr) });

  // print some statistics

  // df.head().print();
  // df.describe().print();
  let matches = df.shape[0];
  let features = df.shape[1]-1;
  let homeAvgScore = df.home_points.mean();
  let awayAvgScore = df.away_points.mean();
  
  let n_homeWins = df.query({ 'column': 'ftr', 'is': '==', 'to': 'H' }).ftr.count();
  let n_awayWins = df.query({ 'column': 'ftr', 'is': '==', 'to': 'A' }).ftr.count();
  let n_ties = df.query({ 'column': 'ftr', 'is': '==', 'to': 'D' }).ftr.count();

  console.log(`Columns [${df.columns}]`);
  console.log(`Total number of games: ${matches}`);
  console.log(`Number of features: ${features}`);
  console.log(`Avg home score ${ formatFloat(homeAvgScore)}`);
  console.log(`Avg away score ${ formatFloat(awayAvgScore) }`);
  console.log(`Avg total score ${ formatFloat(homeAvgScore + awayAvgScore)}`);
  console.log(`Win rate of home team ${ formatFloat(n_homeWins / matches * 100) }`);
  console.log(`Win rate of away team ${ formatFloat(n_awayWins / matches * 100) }`);
  console.log(`Draw rate of both teams ${ formatFloat(n_ties / matches * 100) }`);

  // df.loc({columns:['home_team','home_team_norm','away_team','away_team_norm','home_points',
  // 'away_points','total_points','home_diff','ftr','ftr_norm']}).print();

  // let X_all = df.drop({columns:['week','scheduled','home_team','away_team','ftr'],axis:1});
  let X_all = df.loc({columns:['home_team_norm','away_team_norm','home_points','away_points',
    'home_total_rushing_yards','away_total_rushing_yards','home_total_passing_yards',
    'away_total_passing_yards']});
  X_all.head().print();
  
  let y_all = df.ftr_norm;

  // Standardize the data with MinMaxScaler
  let scaler = new dfd.MinMaxScaler();
  scaler.fit(X_all); //   // df.iloc({ columns: [`1:`] })
  X_all = scaler.transform(X_all);

  X_all.head().print();

  // #Center to the mean and component wise scale to unit variance.
  //  cols = [['HTGD','ATGD','HTP','ATP','DiffLP']]
  //  for col in cols:
  //     X_all[col] = scale(X_all[col])

  // df.loc({rows:[df.home_points.argmax()],columns:['home_team','away_team','home_points','away_points','total_points','home_diff','ftr']}).print();
  // df.loc({rows:[df.home_points.argmin()],columns:['home_team','away_team','home_points','away_points','total_points','home_diff','ftr']}).print();

  let i=1;
}

// function oldDfdTest() {
//   // df['total_points'] = df['home_points'] + df.away_points;
//   // df['total_points'] =  df['home_points', 'away_points'].sum({axis:1});

//   // let total_points = _.map(df['home_points'].values,(val,index)=>{
//   //   return val + df.loc({rows:[index],columns:'away_points'}).values[0];
//   // });

//   // let groupTest = df.loc({columns:['home_points','away_points']});
//   // groupTest.data.apply((x:any)=>{
//   //   return x[0]+x[1];
//   // });

//   // let test = df['home_points'].apply((x:any,y:any)=>{
//   //   return x;
//   // });

//   // let total_points:number[] = [];
//   // for (let i = 0; i<df.shape[0]; i++) {
//   //   total_points.push(df['home_points'].data[i] + df.away_points.data[i]);
//   // }
//   // df.addColumn({column:'total_points',value: total_points});

//     // let encode = new dfd.LabelEncoder();
//   // encode.fit(df['ftr']);
//   // let test = encode.transform(['H']);

// }

run();