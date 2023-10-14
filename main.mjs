import { getGames } from "./shiftchartgames.mjs";
import { analyzeGame } from "./shiftchartanalyze.mjs";
import fs from 'fs';

const args = process.argv.slice(2);
const games = await getGames(args[0]);
games.forEach(async (game) => {
    const stats = await analyzeGame(game.value.doc_id);
    // const filepath = './powerplays.json';
    // const data = JSON.parse(fs.readFileSync(filepath));
    // const updatedData = { ...data, ...stats.pp };
    // fs.writeFileSync(filepath, JSON.stringify(updatedData, null, 4));
    console.log(stats);
});