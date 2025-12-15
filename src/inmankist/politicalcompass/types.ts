export enum PoliticalAxis {
  EconomicLeft = "economic_left",
  EconomicRight = "economic_right",
  Authoritarian = "authoritarian",
  Libertarian = "libertarian",
}

export enum Quadrant {
  AuthLeft = "auth_left",      // Authoritarian Left
  AuthRight = "auth_right",    // Authoritarian Right
  LibLeft = "lib_left",        // Libertarian Left
  LibRight = "lib_right",      // Libertarian Right
  Center = "center",           // Center
}

export interface PoliticalCompassResult {
  quadrant: Quadrant;
  economicScore: number;
  socialScore: number;
}

