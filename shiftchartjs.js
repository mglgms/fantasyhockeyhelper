const fetch = require("node-fetch");
fetch(
  "http://www.shiftchart.com/get_game?key=2023-06-10-golden-knights-panthers",
  {
    headers: {
      accept: "application/json,*/*",
      "accept-language": "en-US,en;q=0.9",
      "if-none-match": '"1214702067"',
      cookie:
        "_ga=GA1.2.1131804046.1695865468; _gid=GA1.2.890429710.1696350280; _gat=1; _ga_LW5DJT49PL=GS1.2.1696355023.4.0.1696355023.0.0.0",
      Referer:
        "http://www.shiftchart.com/game/2023-06-10-golden-knights-panthers",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    body: null,
    method: "GET",
  }
)
  .then((res) => res.json())
  .then((json) => {
    const value = json[0].value;
    const ppshifts = value.shared_toi.filter(
      (stoi) =>
        (stoi.num_skaters_h > stoi.num_skaters_a ||
          stoi.num_skaters_a > stoi.num_skaters_h) &&
        stoi.num_goalies_h === 1 &&
        stoi.num_goalies_a === 1
    );
    const ppids_h = new Set();
    const ppids_a = new Set();
    ppshifts.forEach((element) => {
      if (element.state_h === "PEN") {
        element.onIcePlayerIDs
          .filter((id) => id.startsWith("A"))
          .forEach((id) => ppids_a.add(id));
      }
      if (element.state_a === "PEN") {
        element.onIcePlayerIDs
          .filter((id) => id.startsWith("H"))
          .forEach((id) => ppids_h.add(id));
      }
    });

    players = {};
    value.toi.forEach((toi) => {
      const prefix = toi.team === value.game.home_team_short ? "H" : "A";
      players[`${prefix}${toi.number}`] = `${toi.first_name} ${toi.last_name}`;
    });
    ppplayers_h = Array.from(ppids_h).map((id) => players[id]);
    ppplayers_a = Array.from(ppids_a).map((id) => players[id]);
    console.log('PP players: ', ppplayers_h.concat(ppplayers_a));
  });
