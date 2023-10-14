import { getGames } from "./shiftchartgames.mjs";

const args = process.argv.slice(2);
const games = getGames(args[0]);
console.log(games);
