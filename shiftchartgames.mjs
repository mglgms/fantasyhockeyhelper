import fetch from "node-fetch";

export async function getGames(date) {
  const games = await fetch("http://www.shiftchart.com/cal?key=" + date, {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
    },
    referrer:
      "http://www.shiftchart.com",
    referrerPolicy: "strict-origin-when-cross-origin",
    body: null,
    method: "GET",
    mode: "cors",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((json) => {
      return json;
    });
  return games;
}
