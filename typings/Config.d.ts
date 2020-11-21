/* tslint:disable */
/* eslint-disable */
declare module "node-config-ts" {
  interface IConfig {
    sportRadar: SportRadar
  }
  interface SportRadar {
    nfl_api: string
  }
  export const config: Config
  export type Config = IConfig
}
