# Arhitectură — GraphFlow BAC

GraphFlow ține matematica, starea și desenul în trei straturi. Un algoritm nou nu are voie să deseneze și o componentă nu are voie să recalculeze un drum minim.

| Strat | Rol | Nu face |
| --- | --- | --- |
| `src/core/` | Graf, reprezentări BAC, algoritmi, inspector, export, partajare | Nu importă React |
| `src/store/` | Zustand: graful editabil și playerul | Nu desenează SVG |
| `src/components/` | Canvas, player, debugger C++, inspector, galerie | Nu reimplementează algoritmul |

## Snapshot-uri reversibile

Un algoritm nu rulează în timpul animației. `runBFS`, `runDijkstra`, `runKruskal` și celelalte funcții `run*` întorc dintr-o dată `AlgorithmStep[]`. Playerul păstrează vectorul și un `currentStepIndex`.

`AlgorithmStep` este un cadru complet, nu un delta. Conține, cu indexare de la 1:

- `viz[]`, `tata[]`, `dist[]` (`null` înseamnă infinit sau „încă necalculat”)
- coada BAC `C`, cu `items`, `st` și `dr`
- stiva DFS, când algoritmul are una
- starea vizuală a fiecărui nod și a fiecărei muchii
- `outputOrder`, `cppLine` și, la ultimul cadru relevant, `summaryVerdict`

`Recorder` din `src/core/algorithms/traversals.ts` (și `Tape` din algoritmii de cost și din Euler / Hamilton) mută starea de lucru, apoi `snap()` copiază vectorii:

```ts
viz: this.viz.slice(),
tata: this.tata.slice(),
dist: this.dist.slice(),
queue: this.queue
  ? { items: this.queue.items.slice(), st: this.queue.st, dr: this.queue.dr }
  : null,
```

Cadrul vechi nu se schimbă când algoritmul continuă. Pasul înainte, pasul înapoi și scrub-ul pe slider sunt atribuiri de index. `stepBackward` oprește redarea. `Esc` golește `steps` și readuce indexul la `-1`, adică modul de editare.

Există și un al doilea istoric, separat: `useGraphStore` păstrează până la 100 de `GraphSnapshot` pentru Undo / Redo (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`). Acesta reface noduri și muchii. Playback-ul nu intră în acel istoric.

Dacă structura grafului se schimbă în timpul unei execuții, abonamentul din `useAlgorithmStore.ts` anulează rularea. Mutarea unui nod nu o anulează, pentru că snapshot-urile sunt legate de id-uri, nu de coordonate.

## Invariantul 1..N

Nodurile sunt numerotate strict `1..N`, fără goluri, ca în `int a[101][101]` de la bacalaureat.

- `toAdjacencyMatrix` întoarce o matrice `(N+1) × (N+1)`. Linia 0 și coloana 0 rămân nefolosite.
- `viz[0]`, `tata[0]` și `d[0]` există doar ca să indice ca în C++. Valorile utile sunt pe `1..N`.
- Muchia neorientată are cheia `min--max`. Muchia orientată are cheia `u->v`.
- `fromParentArray` citește `tata[1..n]`. Rădăcina este poziția unde valoarea este `0`. Un vector valid produce exact `N − 1` muchii.
- La `removeNode(k)`, nodurile cu id mai mare decât `k` scad cu 1. Etichetele care erau chiar numărul vechi se rescriu. Etichetele custom rămân. Muchiile incidente dispar, celelalte capete se renumerotează, iar id-urile de muchie se recalculează.

Testele din `src/core/__tests__/` fixează acest contract: simetria matricei, gradele, respingerea unui nod în afara `1..N`, vectorul de tați și rezultatele numerice ale algoritmilor.

## Cum adaugi un algoritm

1. Extinzi `AlgorithmId` în `src/core/algorithms/types.ts`.
2. Scrii `runNume(graph, startNode): AlgorithmStep[]` în `traversals.ts`, `weighted.ts` sau `eulerHamilton.ts`. Folosești `Recorder` sau `Tape`, ții vectorii de la 1 și apelezi `snap()` la fiecare linie pe care elevul trebuie să o vadă. `cppLine` trebuie să cadă pe o linie reală din listing.
3. Adaugi textul C++ în `cppSourceFor` (`src/core/algorithms/traversals.ts`) și profilul de complexitate în `programProfile` (`src/core/algorithms/cppProgram.ts`). Aceleași șiruri apar în panoul de debugger și în tabelul din README.
4. Adaugi un `case` în `runSelected` din `src/store/useAlgorithmStore.ts`.
5. Adaugi butonul în `ALGORITHM_GROUPS` din `src/components/player/AlgorithmPlayer.tsx`. Dacă algoritmul cere nod de start, îl pui și în `START_ALGORITHMS`.
6. Opțional: un scenariu în `src/core/presets.ts` și un test în `src/core/__tests__/`.

UI-ul nu mai are nimic de știut despre coadă sau despre cost. Primește cadre gata făcute. De aceea un algoritm nou nu trece prin canvas.
