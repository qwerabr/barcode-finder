let registry;
let database = [];

function normalizeBarcode(value) {

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

}

async function loadRegistry() {

  registry = await fetch("registry.json")
    .then(r => r.json());

  for (const table of registry.tables) {

    await loadSheet(table);

  }

  console.log(
    `Loaded ${database.length} records`
  );

  if (!window.scannerStarted) {
startScanner();
window.scannerStarted = true;
  }

}

async function reloadData() {

  

document.getElementById("status")
.innerText = "Загрузка данных...";

database = [];

await loadRegistry();

document.getElementById("status")
.innerText =
`Загружено ${database.length} записей`;

}

async function loadSheet(table) {

  const url =
   `https://docs.google.com/spreadsheets/d/${table.sheetId}/gviz/tq?tqx=out:json&v=${Date.now()}`;

  try {

    const text =
      await fetch(url)
      .then(r => r.text());

    const json =
      JSON.parse(
        text.substring(47).slice(0, -2)
      );

    const rows =
      json.table.rows || [];

    rows.forEach(row => {

      const packet =
        row.c?.[0]?.v;

      const barcode =
        row.c?.[1]?.v;

      if (!packet || !barcode)
        return;

      const normalized =
        normalizeBarcode(barcode);

      database.push({

        file: table.name,

        packet:
          String(packet).trim(),

        barcode:
          String(barcode).trim(),

        prefix:
          normalized.substring(
            0,
            registry.searchLength
          )

      });

    });

  } catch (err) {

    console.error(
      `Error loading ${table.name}`,
      err
    );

  }

}

function searchBarcode(code) {

  const normalized =
    normalizeBarcode(code);

  const prefix =
    normalized.substring(
      0,
      registry.searchLength
    );

  return database.filter(
    x => x.prefix === prefix
  );

}

function saveHistory(code) {

  let history =
    JSON.parse(
      localStorage.getItem("history")
      || "[]"
    );

  history.unshift({

    time:
      new Date()
      .toLocaleTimeString(),

    code

  });

  history =
    history.slice(
      0,
      registry.historySize
    );

  localStorage.setItem(
    "history",
    JSON.stringify(history)
  );

  renderHistory();

}

function renderHistory() {

  const history =
    JSON.parse(
      localStorage.getItem("history")
      || "[]"
    );

  document
    .getElementById("history")
    .innerHTML =
    history.map(h =>

      `<div class="history">
        ${h.time}
        &nbsp;
        ${h.code}
      </div>`

    ).join("");

}

function showResults(found) {

  const div =
    document.getElementById(
      "results"
    );

  if (!found.length) {

    div.innerHTML =

      `<div class="result">
        ❌ Совпадений не найдено
      </div>`;

    return;

  }

  div.innerHTML =

    `<div class="result">
      ✅ Найдено:
      ${found.length}
      совпадений
    </div>`

    +

    found.map(x =>

      `<div class="result">

        📄 ${x.file}<br>

        📦 Пакет:
        <b>${x.packet}</b><br>

        🏷️ ${x.barcode}

      </div>`

    ).join("");

}

function startScanner() {

  const scanner =
    new Html5QrcodeScanner(
      "reader",
      {
        fps: 5,
        qrbox: 250,
        rememberLastUsedCamera: true
      }
    );

  scanner.render(

    function(code) {

      saveHistory(code);

      const found =
        searchBarcode(code);

      showResults(found);

      if (
        found.length &&
        navigator.vibrate
      ) {

        navigator.vibrate(100);

      }

    },

    function() {}

  );

}

if ("serviceWorker" in navigator) {

  navigator.serviceWorker
    .register("sw.js");

}

renderHistory();

loadRegistry();

document
.getElementById("reloadBtn")
.addEventListener(
"click",
reloadData
);
