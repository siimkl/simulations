# Simulations & Explainers

Avalik kataloog asub aadressil https://siimkl.github.io/simulations/.

`catalog-sources.json` seob iga püsiva kaardiaadressi kohalike versioonikaustade või juba avaldatud GitHub Pagesi lehega. Kohalikke versioone proovitakse avaldamiskõlblike failide muutmisaja järgi uusimast vanimani. Kataloog säilitab viimase kontrollitud koopia, kui uuem kandidaat ei käivitu. Ühel kaardil võib olla mitu teemamärgendit.

Käivita `simulations` hoidlas, kui lähtekaustad on selle kõrval samas tööruumis.

```powershell
python -m pip install Pillow websocket-client
python scripts/sync_catalog.py
python scripts/check_site.py
```

Sünkroonimine kontrollib käivitumist Chrome’is, tekitab pisipildid ja uuendab avaldamispaketti `dist/`. Paketil on püsivad alamteed `labs/<id>/`. Avaldatud simulatsioonide lingid kasutavad nende enda jooksvaid väljalaskeid. Lähtefailid võivad asuda mujal, kui määrad `--workspace`. Chrome’i faili saab määrata valikuga `--browser`.

Kui `dist/`, kataloogi allikate loend ja `catalog.lock.json` on commit’itud, avaldab GitHub Actions need pärast `main` harusse saatmist. Lokaalseks eelvaateks käivita `python -m http.server 8040 --directory dist` ja ava http://127.0.0.1:8040/.
