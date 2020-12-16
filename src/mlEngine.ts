import _ from 'lodash';
import * as dfd from 'danfojs-node';
import * as tf from '@tensorflow/tfjs-node';
import { mean } from 'd3';

import { teams } from './utils/teams';
import { formatFloat } from './utils/utils';
import { doSeason } from './statsEngine';
import { data } from '@tensorflow/tfjs-node';

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

  return [Xtrain.tensor, ytrain.tensor, Xtrain] //return the data as tensors
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

export async function train() {
  const model = await get_model();
  const data = await load_process_data();
  const Xtrain = data[0];
  const ytrain = data[1];
  const origX = data[2];

  origX.head().print();

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

export async function dfdTest() {
  // let df = await dfd.read_csv('https://web.stanford.edu/class/archive/cs/cs109/cs109.1166/stuff/titanic.csv');
  let df = await dfd.read_csv('./output/20201204-085904_season.csv');
  
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

  let testIt = xAvgTransform(df,3);

  // let ravensGames = getTeamGames(df,'Ravens');
  // let testIt = getXWeekAvgs(ravensGames,'Ravens',0,3);

  // let seasonData = await doSeason(false);
  // let grp = df.groupby(['home_team','away_team']);
  // let grp2 = df.groupby(['away_team']);
  // grp.agg({'home_points':'mean','away_points':'mean'}).print();

  // df.addColumn({column:'team_total_points_avg'}


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
  // X_all.head().print();
  
  let y_all = df.ftr_norm;

  // Standardize the data with MinMaxScaler
  let scaler = new dfd.MinMaxScaler();
  scaler.fit(X_all); //   // df.iloc({ columns: [`1:`] })
  let X_all_scale = scaler.transform(X_all);

  // X_all_scale.head().print();

  let test = df.loc({columns:['home_team','home_team_norm']});
  test.addColumn({column:'home_team_scale',value:X_all_scale[0]});
  let teamIndexes = createTeamIndex(test);

  // #Center to the mean and component wise scale to unit variance.
  //  cols = [['HTGD','ATGD','HTP','ATP','DiffLP']]
  //  for col in cols:
  //     X_all[col] = scale(X_all[col])

  // df.loc({rows:[df.home_points.argmax()],columns:['home_team','away_team','home_points','away_points','total_points','home_diff','ftr']}).print();
  // df.loc({rows:[df.home_points.argmin()],columns:['home_team','away_team','home_points','away_points','total_points','home_diff','ftr']}).print();

  let model = await dfdTrain(X_all_scale.tensor,y_all.tensor);

  // let data = {"home_team":['Bears'],"away_team":['Lions']};
  // let dt_test = new dfd.DataFrame(data);
  // encoder.fit(_.map(teams,'team'));
  // _.keys(data).forEach(col=>dt_test.addColumn({ column: col+'_norm', value: encoder.transform(dt_test[col])}));
  // dt_test.head().print();
  // let X_predict = dt_test.loc({columns:['home_team_norm','away_team_norm']});
  // scaler.fit(X_predict);
  // X_predict = scaler.transform(X_predict);

  // X_predict.head().print();

  // let i=1;

  // let data = {"0":[_.find(teamIndexes,['home_team','Bears']).home_team_scale],"1":[_.find(teamIndexes,['home_team','Lions']).home_team_scale]};
  // let dt_test = new dfd.DataFrame(data);
  // dt_test.head().print();

  // dfdPredict(model,dt_test.tensor);
}

interface iTeamGames {
  all: any[],
  homeGames: any[],
  awayGames: any[]
}

function combineHomeAwayGames(homeGames:any[],awayGames:any[]) : any[] {
  let all = _.concat([],homeGames,awayGames);
  return _.sortBy(all, each=>each[0]);
}

function getTeamGames(dataframe:any,team:string) : any {
  let homeGames = dataframe.query({ 'column': 'home_team', 'is': '==', 'to': team });
  let awayGames = dataframe.query({ 'column': 'away_team', 'is': '==', 'to': team });
  let allGames = dfd.concat({ df_list: [homeGames, awayGames], axis: 0 }).sort_values({by: 'scheduled'});

  let teamData = allGames.loc({columns:['week','id','scheduled']});
  teamData.addColumn({column:'team',value:Array(allGames.shape[0]).fill(team)});

  // let data = {"team":Array(dataframe.size[1]).fill(team)};
  // let teamData = new dfd.DataFrame(data);
  
  // allGames.data.forEach((game:any) => {
  //   // ['home_points','home_total_rushing_yards','home_total_passing_yards','home_diff',
  //   // 'away_points','away_total_rushing_yards','away_total_passing_yards','away_diff']
  // });
  ['_points','_total_rushing_yards','_total_passing_yards','_diff'].forEach((col:string)=>{
    let off:any[]=[],def:any[]=[],wld:string[]=[];
    let combined = allGames.loc({columns:['home_team','away_team','home'+col,'away'+col,'ftr']});
    combined.data.forEach((reduced:any) => {
      // check if home team
      if (reduced[0] === team) {
        off.push(reduced[2]);
        def.push(reduced[3]);
      }
      else {
        off.push(reduced[3]);
        def.push(reduced[2]);
      }
    });
    teamData.addColumn({column:'off'+col,value:off});
    teamData.addColumn({column:'def'+col,value:def});
  });
  let combined = allGames.loc({columns:['home_team','away_team','ftr']});
  let wld:string[]=[];
  combined.data.forEach((reduced:any) => {
    if (reduced[0] === team) {
      wld.push(reduced[2]==='H'?'W':reduced[4]==='D'?'D':'L');
    }
    else {
      wld.push(reduced[2]==='A'?'W':reduced[4]==='D'?'D':'L');
    }
  });
  teamData.addColumn({column:'wld',value:wld});

  return {
    homeGames,
    awayGames,
    allGames,
    teamData
  };
}

function xAvgTransform(dataframe:any,xGames:number) : any {

  const offset = Math.max(xGames-1,0);

  // let df = dataframe.loc({columns:['week','id','scheduled','home_team','away_team']});
  let df = dataframe.iloc({columns:['0:4']});
  let transform = dataframe.loc({columns:['home_points','away_points','home_total_rushing_yards','away_total_rushing_yards',
    'home_total_passing_yards','away_total_passing_yards','home_diff','away_diff']});

  let teamsData = new Map();

  // get team calcs
  _.values(teams).forEach( (team:any) => {
    // create xAvg values
    let teamGames = getTeamGames(dataframe,team.team);
    let teamData = teamGames.teamData;

    // returns dfd.series
    ['_points','_total_rushing_yards','_total_passing_yards','_diff'].forEach((col:string)=>{
      let combined = teamData.loc({columns:['off'+col]});
      let value = _.map(combined.data,(val:any,i:number)=>{
        let start:number = (i <= offset) ? 0 : (i-offset);
        return mean(combined.data.slice(start,i+1));
      });
      teamData.addColumn({column:`avg_x_off${col}`,value});
      let total = _.map(combined.data,(val:any,i:number)=>mean(combined.data.slice(0,i+1)));
      teamData.addColumn({column:`total_x_off${col}`,total})

      combined = teamData.loc({columns:['def'+col]});
      value = _.map(combined.data,(val:any,i:number)=>{
        let start:number = (i <= offset) ? 0 : (i-offset);
        return mean(combined.data.slice(start,i+1));
      });
      teamData.addColumn({column:`avg_x_def${col}`,value});
      total = _.map(combined.data,(val:any,i:number)=>mean(combined.data.slice(0,i+1)));
      teamData.addColumn({column:`total_x_def${col}`,total})
    });

    teamsData.set(team.team,teamData);
  });

  // transform.columns.forEach( (col:string) =>{
  //   if (/home/.test(col)) {

  //   }
  //   else {

  //   }

  //   // // returns dfd.series
  //   // let colVals = teamGames.allGames[col];
  //   // // loop thru the data and create a new transformed array
  //   // let value = _.map(colVals.data,(val:any,i:number)=>{
  //   //   let start:number = (i <= offset) ? 0 : (i-offset);
  //   //   let avg = mean(colVals.slice(start,i));
  //   //   return avg;
  //   // });

  //   // df.addColumn({column:col,value});
  // }); 

  // df.addColumn({column:'ftr',value:df.home_diff.map((val:number)=>{
  //   if (val>0) {
  //     return 'H';
  //   }
  //   else if (val<0) {
  //     return 'A';
  //   }
  //   else {
  //     return 'D';
  //   }
  // })});

  return teamsData;
}

async function dfdTrain(X_all:any,y_all:any) : Promise<tf.Sequential> {
  const model:tf.Sequential = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [X_all.shape[1]], units: 124, activation: 'relu', kernelInitializer: 'leCunNormal' }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.summary();

  model.compile({
    optimizer: "rmsprop",
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  console.log("Training started....")
  try {
    await model.fit(X_all, y_all,{
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

  return model;
}

async function dfdPredict(model:tf.Sequential,features:any) {
  try {
    let predict = model.predict(features);
    let i = 1;
  }
  catch (err) {
    console.log(err);
  }

  // f1, acc = predict_labels(clf, X_test, y_test)
  // def predict_labels(clf, features, target):
  //   ''' Makes predictions using a fit classifier based on F1 score. '''
    
  //   # Start the clock, make predictions, then stop the clock
  //   start = time()
  //   y_pred = clf.predict(features)
    
  //   end = time()
  //   # Print and return results
  //   print "Made predictions in {:.4f} seconds.".format(end - start)
    
  //   return f1_score(target, y_pred, pos_label='H'), sum(target == y_pred) / float(len(y_pred))
}

function getMapFromDataFrame(dataFrame:any,searchTerm:any) : any{
  return dataFrame.query(searchTerm).unique();
}

function getTeamIndex(dataFrame:any,team:string) : any {
  return getMapFromDataFrame(dataFrame,{ 'column': 'home_team', 'is': '==', 'to': team });
}

function createTeamIndex(dataFrame:any) : any {
  return _.map(teams,team=>{
    let lookup = dataFrame.query({ 'column': 'home_team', 'is': '==', 'to': team.team }).unique();
    if (lookup) {
      let retVal:any = {};
      _.each(lookup, (val,key) => {
        retVal[key] = _.first(val);
      });
      return retVal;
    }
    else {
      return {
        team: team.team,
        norm: 'unknown',
        scale: 'unknown'
      }
    }
  })
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
