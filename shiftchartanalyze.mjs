import fetch from "node-fetch";

export async function analyzeGame(game) {
  const stats = await fetch("http://www.shiftchart.com/get_game?key=" + game, {
    headers: {
      accept: "application/json,*/*",
      "accept-language": "en-US,en;q=0.9",
      "if-none-match": '"1214702067"',
      cookie:
        "_ga=GA1.2.1131804046.1695865468; _gid=GA1.2.890429710.1696350280; _gat=1; _ga_LW5DJT49PL=GS1.2.1696355023.4.0.1696355023.0.0.0",
      Referer: "http://www.shiftchart.com/game/" + game,
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    body: null,
    method: "GET",
  })
    .then((res) => res.json())
    .then((json) => {
      const gameInfo = json[0].value;

      const players = {};
      gameInfo.toi.forEach((toi) => {
        const prefix = toi.team === gameInfo.game.home_team_short ? "H" : "A";
        players[`${prefix}${toi.number}`] = toi;
      });

      const { ppplayers_h, ppplayers_a } = getPowerPlayTimes(gameInfo, players);
      const playerWatch = watchPlayers(gameInfo, players);
      const injuredPlayers = [];

      Object.entries(playerWatch[`${gameInfo.game.home_team_short}`]).forEach(
        ([player, player_probe]) => {
          const last_shared_toi =
            gameInfo.shared_toi[gameInfo.shared_toi.length - 1];
          const gametime = convertSharedToiToGameTime(last_shared_toi);
          if (player_probe.last_seen < gametime - 6) {
            injuredPlayers.push(player);
          }
        }
      );
      Object.entries(playerWatch[`${gameInfo.game.away_team_short}`]).forEach(
        ([player, player_probe]) => {
          const last_shared_toi =
            gameInfo.shared_toi[gameInfo.shared_toi.length - 1];
          const gametime = convertSharedToiToGameTime(last_shared_toi);
          if (player_probe.position !== "G") {
            if (player_probe.last_seen < gametime - 5) {
              injuredPlayers.push(player);
            }
          }
        }
      );

      return {
        pp: {
          [gameInfo.game.home_team_short]: ppplayers_h,
          [gameInfo.game.away_team_short]: ppplayers_a,
        },
        injuredPlayers,
      };
    });
  return stats;
}

function convertSharedToiToGameTime(shared_toi) {
  return shared_toi.start_cum + shared_toi.duration;
}

function convertShiftToGameTime(toi) {
  const period = Math.min(toi.period, 4);
  return (period - 1) * 20 + toi.start + toi.duration;
}

function getPowerPlayTimes(gameInfo, players) {
  const pp_tois = gameInfo.shared_toi.filter(
    (shared_toi) =>
      shared_toi.state_game == "HP" || shared_toi.state_game == "AP"
  );

  const ppids_h = {};
  const ppids_a = {};
  pp_tois.forEach((pp_toi) => {
    const pp_ids = Array.isArray(pp_toi.onIcePlayerIDs)
      ? pp_toi.onIcePlayerIDs
      : [pp_toi.onIcePlayerIDs];
    if (pp_toi.state_game === "HP") {
      const pp_skaters = pp_ids.filter(
        (id) => id.startsWith("A") && players[id].position !== "G"
      );
      pp_skaters.forEach((id) => {
        if (ppids_a[id]) {
          ppids_a[id] += pp_toi.duration;
        } else {
          ppids_a[id] = pp_toi.duration;
        }
      });
    }
    if (pp_toi.state_game === "AP") {
      const pp_skaters = pp_ids.filter(
        (id) => id.startsWith("H") && players[id].position !== "G"
      );
      pp_skaters.forEach((id) => {
        if (ppids_h[id]) {
          ppids_h[id] += pp_toi.duration;
        } else {
          ppids_h[id] = pp_toi.duration;
        }
      });
    }
  });

  const ppplayers_h = {};
  Object.entries(ppids_h).forEach((entry) => {
    const player = players[entry[0]];
    ppplayers_h[`${player.first_name} ${player.last_name}`] = entry[1];
  });
  const ppplayers_a = {};
  Object.entries(ppids_a).forEach((entry) => {
    const player = players[entry[0]];
    ppplayers_a[`${player.first_name} ${player.last_name}`] = entry[1];
  });
  return { ppplayers_h, ppplayers_a };
}

function watchPlayers(game_info, players_map) {
  const player_probes_h = {};
  const player_probes_a = {};

  game_info.shared_toi.forEach((shared_toi) => {
    const players = Array.isArray(shared_toi.onIcePlayerIDs)
      ? shared_toi.onIcePlayerIDs.map((id) => players_map[id])
      : [players_map[shared_toi.onIcePlayerIDs]];

    const isEvenStrength =
      shared_toi.state_game === "ES" &&
      shared_toi.state_h === "FS" &&
      shared_toi.state_a === "FS";

    players.forEach((player) => {
      const player_name = getPlayerName(player);
      const player_probes =
        player.team === game_info.game.home_team_short
          ? player_probes_h
          : player_probes_a;

      if (!player_probes[player_name]) {
        player_probes[player_name] = {};
      }

      player_probes[player_name].last_seen =
        convertSharedToiToGameTime(shared_toi);
      player_probes[player_name].position = player.position;

      const isForward = isForward_(player);
      if (isForward && isEvenStrength) {
        if (!player_probes[player_name]["fs_linemates"]) {
          player_probes[player_name]["fs_linemates"] = {};
        }
        const linemates = players.filter(
          (otherPlayer) =>
            otherPlayer.number != player.number &&
            isForward_(otherPlayer) &&
            player.team === otherPlayer.team
        );

        linemates.forEach((linemate) => {
          const linemateName = getPlayerName(linemate);
          if (!player_probes[player_name]["fs_linemates"]) {
            player_probes[player_name]["fs_linemates"] = {};
          }
          if (player_probes[player_name]["fs_linemates"][`${linemateName}`]) {
            player_probes[player_name]["fs_linemates"][`${linemateName}`] +=
              shared_toi.duration;
          } else {
            player_probes[player_name]["fs_linemates"][`${linemateName}`] =
              shared_toi.duration;
          }
        });
      }
    });
  });

  return {
    [`${game_info.game.home_team_short}`]: player_probes_h,
    [`${game_info.game.away_team_short}`]: player_probes_a,
  };
}

function getPlayerName(player) {
  return `${player.first_name} ${player.last_name}`;
}

function isForward_(player) {
  return (
    player.position === "C" ||
    player.position === "R" ||
    player.position === "L"
  );
}
