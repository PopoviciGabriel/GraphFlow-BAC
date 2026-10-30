/**
 * File names, BAC complexity, and a compilable Code::Blocks program
 * for every algorithm. `AlgorithmStep.cppLine` indexes `cppSourceFor`,
 * which is pasted unchanged under the includes.
 */
import { graphSize, serializeToBacFormat } from '../representations'
import type { GraphStateData } from '../types'
import { cppSourceFor } from './traversals'
import type { AlgorithmId } from './types'

export interface CppListingInfo {
  fileName: string
  /** Textbook bound for the listing that is actually shown, for example `O(n^2)`. */
  time: string
  memory: string
  source: string
}

interface ProgramProfile {
  fileName: string
  time: string
  memory: string
  globals: string
  matrix: boolean
  edgeList: boolean
  run: (start: number, target: number) => string
}

const MATRIX = `int n, m;
int a[101][101];`

export function cppListing(algorithm: AlgorithmId, isDirected: boolean): CppListingInfo {
  const profile = programProfile(algorithm, isDirected)
  return {
    fileName: profile.fileName,
    time: profile.time,
    memory: profile.memory,
    source: cppSourceFor(algorithm, isDirected),
  }
}

export function compileBacProgram(input: {
  algorithm: AlgorithmId
  graph: GraphStateData
  startNode: number
  targetNode: number | null
}): string {
  const n = graphSize(input.graph.nodes)
  const start = clampNode(input.startNode, n)
  const target =
    input.targetNode !== null && input.targetNode >= 1 && input.targetNode <= n ? input.targetNode : 0
  const profile = programProfile(input.algorithm, input.graph.isDirected)
  const bac = serializeToBacFormat(input.graph).replace(/\*\//g, '* /').trimEnd()
  const lines = [
    `// ${profile.fileName}`,
    `// Complexitate Timp: ${profile.time}`,
    `// Memorie: ${profile.memory}`,
    '// Listingul de functii de mai jos este cel urmarit de cppLine in GraphFlow.',
    '// Daca bac.in exista langa executabil, programul citeste graful din fisier.',
    '// Altfel foloseste muchiile copiate din canvas.',
    '#include <iostream>',
    '#include <fstream>',
    'using namespace std;',
    '',
    'const int INF = 1000000000;',
    profile.globals,
    '',
    cppSourceFor(input.algorithm, input.graph.isDirected).trimEnd(),
    '',
    '/*',
    'bac.in',
    bac,
    '*/',
    'void incarca()',
    '{',
    '    ifstream fin("bac.in");',
    '    int x, y, c, i;',
    '    if (fin)',
    '    {',
    '        fin >> n >> m;',
    '        for (i = 1; i <= m; i++)',
    '        {',
    '            fin >> x >> y;',
    input.graph.isWeighted ? '            fin >> c;' : '            c = 1;',
    ...readEdge(profile, input.graph.isDirected),
    '        }',
    '        fin.close();',
    '        return;',
    '    }',
    `    n = ${n};`,
    `    m = ${input.graph.edges.length};`,
    ...literalEdges(input.graph, profile),
    '}',
    '',
    'int main()',
    '{',
    '    incarca();',
    '    if (n < 1)',
    '        return 0;',
    ...profile.run(start, target).split('\n'),
    '    return 0;',
    '}',
    '',
  ]
  return lines.join('\n')
}

function programProfile(algorithm: AlgorithmId, isDirected: boolean): ProgramProfile {
  switch (algorithm) {
    case 'bfs':
      return {
        fileName: 'bfs_bac.cpp',
        time: 'O(n^2)',
        memory: 'O(n^2)',
        globals: `${MATRIX}
int viz[101], tata[101], d[101], C[101];`,
        matrix: true,
        edgeList: false,
        run: (start) => `    BFS(${start});`,
      }
    case 'dfs':
      return {
        fileName: 'dfs_bac.cpp',
        time: 'O(n^2)',
        memory: 'O(n^2)',
        globals: `${MATRIX}
int viz[101], tata[101], d[101];`,
        matrix: true,
        edgeList: false,
        run: (start) => `    parcurgere(${start});`,
      }
    case 'connected_components':
      return isDirected
        ? {
            fileName: 'componente_tare_bac.cpp',
            time: 'O(n^3)',
            memory: 'O(n^2)',
            globals: `${MATRIX}
int nrc;
int viz[101], plus[101], minus[101];`,
            matrix: true,
            edgeList: false,
            run: () => `    int i;
    componente_tare_conexe();
    cout << nrc << "\\n";
    for (i = 1; i <= n; i++)
        cout << viz[i] << " ";
    cout << "\\n";`,
          }
        : {
            fileName: 'componente_conexe_bac.cpp',
            time: 'O(n^2)',
            memory: 'O(n^2)',
            globals: `${MATRIX}
int nrc;
int viz[101], tata[101];`,
            matrix: true,
            edgeList: false,
            run: () => `    int i;
    componente();
    cout << nrc << "\\n";
    for (i = 1; i <= n; i++)
        cout << viz[i] << " ";
    cout << "\\n";`,
          }
    case 'cycle_detection':
      return {
        fileName: isDirected ? 'circuit_bac.cpp' : 'ciclu_bac.cpp',
        time: 'O(n^2)',
        memory: 'O(n^2)',
        globals: `${MATRIX}
int viz[101], tata[101], d[101];`,
        matrix: true,
        edgeList: false,
        run: () =>
          isDirected
            ? `    cout << detectie_circuit() << "\\n";`
            : `    cout << detectie_ciclu() << "\\n";`,
      }
    case 'bipartite':
      return {
        fileName: 'bipartit_bac.cpp',
        time: 'O(n^2)',
        memory: 'O(n^2)',
        globals: `${MATRIX}
int viz[101], tata[101], d[101], C[101];`,
        matrix: true,
        edgeList: false,
        run: () => `    cout << verificare_bipartit() << "\\n";`,
      }
    case 'dijkstra':
      return {
        fileName: 'dijkstra_bac.cpp',
        time: 'O(n^2)',
        memory: 'O(n^2)',
        globals: `${MATRIX}
int viz[101], tata[101], d[101], sol[101];`,
        matrix: true,
        edgeList: false,
        run: (start, target) =>
          target > 0
            ? `    Dijkstra(${start});
    reconstituie(${target});
    cout << "\\n";`
            : `    int i;
    Dijkstra(${start});
    for (i = 1; i <= n; i++)
    {
        if (d[i] == INF)
            cout << "INF ";
        else
            cout << d[i] << " ";
    }
    cout << "\\n";`,
      }
    case 'roy_floyd':
      return {
        fileName: 'roy_floyd_bac.cpp',
        time: 'O(n^3)',
        memory: 'O(n^2)',
        globals: `${MATRIX}
int d[101][101];`,
        matrix: true,
        edgeList: false,
        run: () => `    int i, j;
    initializare();
    RoyFloyd();
    for (i = 1; i <= n; i++)
    {
        for (j = 1; j <= n; j++)
        {
            if (d[i][j] == INF)
                cout << "INF ";
            else
                cout << d[i][j] << " ";
        }
        cout << "\\n";
    }`,
      }
    case 'kruskal':
      return {
        fileName: 'kruskal_apm.cpp',
        time: 'O(m^2)',
        memory: 'O(n + m)',
        globals: `int n, m;
struct muchie
{
    int x, y, c;
} e[101];
int tata[101], comp[101];`,
        matrix: false,
        edgeList: true,
        run: () => `    int i;
    sorteaza();
    Kruskal();
    cout << cost << "\\n";
    for (i = 1; i <= n; i++)
        cout << comp[i] << " ";
    cout << "\\n";`,
      }
    case 'prim':
      return {
        fileName: 'prim_apm.cpp',
        time: 'O(n^2)',
        memory: 'O(n^2)',
        globals: `${MATRIX}
int viz[101], tata[101], d[101];`,
        matrix: true,
        edgeList: false,
        run: (start) => `    int i;
    Prim(${start});
    cout << cost << "\\n";
    for (i = 1; i <= n; i++)
        cout << tata[i] << " ";
    cout << "\\n";`,
      }
    case 'rooted_tree':
      return {
        fileName: 'arbore_radacina_bac.cpp',
        time: 'O(n^2)',
        memory: 'O(n^2)',
        globals: `${MATRIX}
int ciclu;
int viz[101], tata[101], C[101], nivel[101];`,
        matrix: true,
        edgeList: false,
        run: (start) => `    BFS_arbore(${start});
    cout << este_arbore() << "\\n";`,
      }
    case 'eulerian':
      return isDirected
        ? {
            fileName: 'euler_orientat_bac.cpp',
            time: 'O(n^2)',
            memory: 'O(n^2)',
            globals: `${MATRIX}
int dplus[101], dminus[101], st[101], circuit[101];`,
            matrix: true,
            edgeList: false,
            run: (start) => `    int i;
    grade_orientat();
    cout << euler << "\\n";
    if (euler)
    {
        hierholzer_orientat(${start});
        for (i = 1; i <= lc; i++)
            cout << circuit[i] << " ";
        cout << "\\n";
    }`,
          }
        : {
            fileName: 'euler_bac.cpp',
            time: 'O(n^2)',
            memory: 'O(n^2)',
            globals: `${MATRIX}
int d[101], st[101], circuit[101];`,
            matrix: true,
            edgeList: false,
            run: (start) => `    int i;
    grade();
    cout << euler << "\\n";
    if (euler)
    {
        hierholzer(${start});
        for (i = 1; i <= lc; i++)
            cout << circuit[i] << " ";
        cout << "\\n";
    }`,
          }
    case 'hamiltonian':
      return {
        fileName: 'hamilton_bac.cpp',
        time: 'O(n!)',
        memory: 'O(n^2)',
        globals: `${MATRIX}
int viz[101], tata[101], d[101];`,
        matrix: true,
        edgeList: false,
        run: () => `    int i, j;
    for (i = 1; i <= n; i++)
    {
        d[i] = 0;
        for (j = 1; j <= n; j++)
            if (i != j && a[i][j] != 0)
                d[i]++;
    }
    cout << verifica_dirac() << "\\n";
    cout << verifica_ore() << "\\n";
    ham(1);
    if (gasit)
    {
        for (i = 1; i <= n; i++)
            cout << sol[i] << " ";
        cout << sol[1] << "\\n";
    }`,
      }
  }
}

function readEdge(profile: ProgramProfile, isDirected: boolean): string[] {
  const lines: string[] = []
  if (profile.matrix) {
    lines.push('            a[x][y] = c;')
    if (!isDirected) lines.push('            if (x != y) a[y][x] = c;')
  }
  if (profile.edgeList) {
    lines.push('            e[i].x = x;')
    lines.push('            e[i].y = y;')
    lines.push('            e[i].c = c;')
  }
  return lines
}

function literalEdges(graph: GraphStateData, profile: ProgramProfile): string[] {
  const lines: string[] = []
  graph.edges.forEach((edge, index) => {
    const cost = graph.isWeighted ? cppInt(edge.weight) : '1'
    const slot = index + 1
    if (profile.matrix) {
      lines.push(`    a[${edge.source}][${edge.target}] = ${cost};`)
      if (!graph.isDirected && edge.source !== edge.target) {
        lines.push(`    a[${edge.target}][${edge.source}] = ${cost};`)
      }
    }
    if (profile.edgeList) {
      lines.push(`    e[${slot}].x = ${edge.source};`)
      lines.push(`    e[${slot}].y = ${edge.target};`)
      lines.push(`    e[${slot}].c = ${cost};`)
    }
  })
  return lines
}

function cppInt(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return String(Math.round(value))
}

function clampNode(node: number, n: number): number {
  if (n <= 0) return 1
  if (!Number.isInteger(node) || node < 1 || node > n) return 1
  return node
}
