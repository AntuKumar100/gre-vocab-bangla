import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTooltip } from "../charts/Tooltip";
import { Icon } from "../components/Icon";
import { useApp } from "../lib/context";
import { go } from "../lib/router";
import { stageOf, useProgress } from "../lib/store";
import { STAGES, STAGE_LABEL, type Word } from "../lib/types";

interface GNode extends SimulationNodeDatum {
  key: string;
  label: string;
  word?: Word;
  /** Word belongs to the group being mapped (vs. pulled in from another group). */
  home?: boolean;
}
interface GLink {
  source: GNode;
  target: GNode;
}

/**
 * Words and their synonyms as one network. Synonyms shared between words, and
 * synonyms that are themselves on the list, pull related words into clusters.
 */
function buildGraph(home: Word[], all: Word[]) {
  const wordByName = new Map<string, Word>();
  for (const w of all) if (!wordByName.has(w.word)) wordByName.set(w.word, w);
  const bySyn = new Map<string, Word[]>();
  for (const w of all)
    for (const s of w.synonyms) {
      if (!bySyn.has(s)) bySyn.set(s, []);
      bySyn.get(s)!.push(w);
    }

  const nodes = new Map<string, GNode>();
  const links: GLink[] = [];
  const seen = new Set<string>();
  const homeIds = new Set(home.map((w) => w.id));
  const wordNode = (w: Word) => {
    const key = `w:${w.word}`;
    if (!nodes.has(key)) nodes.set(key, { key, label: w.word, word: w, home: homeIds.has(w.id) });
    else if (homeIds.has(w.id)) nodes.get(key)!.home = true;
    return nodes.get(key)!;
  };
  const synNode = (s: string) => {
    const onList = wordByName.get(s);
    if (onList) return wordNode(onList);
    const key = `s:${s}`;
    if (!nodes.has(key)) nodes.set(key, { key, label: s });
    return nodes.get(key)!;
  };
  const link = (a: GNode, b: GNode) => {
    if (a === b) return;
    const k = [a.key, b.key].sort().join("|");
    if (seen.has(k)) return;
    seen.add(k);
    links.push({ source: a, target: b });
  };

  for (const w of home) {
    const wn = wordNode(w);
    for (const s of w.synonyms) {
      const sn = synNode(s);
      link(wn, sn);
      // Other listed words sharing this synonym join the cluster.
      for (const other of bySyn.get(s) ?? []) if (other.id !== w.id) link(wordNode(other), sn);
    }
  }
  return { nodes: [...nodes.values()], links };
}

function layout(nodes: GNode[], links: GLink[]) {
  const sim = forceSimulation(nodes)
    .force("link", forceLink<GNode, GLink>(links).distance((l) => (l.source.word && l.target.word ? 60 : 44)).strength(0.6))
    .force("charge", forceManyBody().strength(-110))
    .force("x", forceX(0).strength(0.05))
    .force("y", forceY(0).strength(0.07))
    // Labels are wide, so give each node room roughly proportional to its text.
    .force("collide", forceCollide<GNode>((n) => (n.home ? 10 + n.label.length * 4.3 : n.word ? 8 + n.label.length * 3.7 : 5 + n.label.length * 3)).strength(0.9))
    .stop();
  for (let i = 0; i < 400; i++) sim.tick();
  const xs = nodes.map((n) => n.x!);
  const ys = nodes.map((n) => n.y!);
  const pad = 60;
  return {
    x: Math.min(...xs) - pad,
    y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: Math.max(...ys) - Math.min(...ys) + pad * 2,
  };
}

export function SynonymMap({ group }: { group: number }) {
  const { index, openWord } = useApp();
  const { cards } = useProgress();
  const [hover, setHover] = useState<string | null>(null);
  const { ref, show, hide, node: tip } = useTooltip();
  const scroller = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  const graph = useMemo(() => {
    const g = buildGraph(index.byGroup.get(group) ?? [], index.words);
    const box = layout(g.nodes, g.links);
    const neighbors = new Map<string, Set<string>>();
    for (const l of g.links) {
      for (const [a, b] of [[l.source, l.target], [l.target, l.source]]) {
        if (!neighbors.has(a.key)) neighbors.set(a.key, new Set());
        neighbors.get(a.key)!.add(b.key);
      }
    }
    return { ...g, box, neighbors };
  }, [index, group]);

  // Start at a zoom where labels stay readable (scroll to pan), centred on the graph.
  const fit = () => {
    const el = scroller.current;
    if (!el) return 1;
    return Math.min(1.2, Math.max(0.8, el.clientWidth / graph.box.w));
  };
  useLayoutEffect(() => {
    setZoom(fit());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);
  useEffect(() => {
    const el = scroller.current;
    if (el) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    }
  }, [graph, zoom]);
  const zoomBy = (f: number) => setZoom((z) => Math.min(2.5, Math.max(0.4, z * f)));

  const active = hover ? new Set([hover, ...(graph.neighbors.get(hover) ?? [])]) : null;
  const pick = (n: GNode) => n.word && openWord(n.word.id);

  return (
    <div className="page map-page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => go(`/group/${group}`)} aria-label="Back to group">
          <Icon name="arrowLeft" />
        </button>
        <h1>Synonym map</h1>
        <div className="spacer" />
        <select value={group} onChange={(e) => go(`/map/${e.target.value}`)} aria-label="Group">
          {index.groups.map((g) => (
            <option key={g} value={g}>
              Group {g}
            </option>
          ))}
        </select>
      </div>
      <p className="muted small">
        Each word links to its synonyms. Words that share a synonym end up close together, so you learn them as a family.
        Hover or tap a word to see its links; click to open it.
      </p>
      <div className="map-wrap" ref={ref}>
        <div className="map-zoom" role="group" aria-label="Zoom">
          <button className="icon-btn" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out">
            −
          </button>
          <button className="icon-btn" onClick={() => setZoom(fit())} aria-label="Reset zoom">
            ⤢
          </button>
          <button className="icon-btn" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
            +
          </button>
        </div>
        <div className="map-scroll" ref={scroller}>
        <svg
          className="synmap"
          width={graph.box.w * zoom}
          height={graph.box.h * zoom}
          viewBox={`${graph.box.x} ${graph.box.y} ${graph.box.w} ${graph.box.h}`}
          role="img"
          aria-label={`Synonym network for group ${group}`}
        >
          <g className="links">
            {graph.links.map((l, i) => (
              <line
                key={i}
                x1={l.source.x}
                y1={l.source.y}
                x2={l.target.x}
                y2={l.target.y}
                className={active && !(active.has(l.source.key) && active.has(l.target.key)) ? "dim" : active ? "hot" : ""}
              />
            ))}
          </g>
          <g className="nodes">
            {graph.nodes.map((n) => {
              const stage = n.word ? stageOf(cards[n.word.id]) : null;
              const dim = active && !active.has(n.key);
              return (
                <g
                  key={n.key}
                  transform={`translate(${n.x},${n.y})`}
                  className={`node${n.word ? " word" : " syn"}${n.home ? " home" : ""}${dim ? " dim" : ""}`}
                  onPointerEnter={(e) => {
                    setHover(n.key);
                    show(e, n.word ? <><strong>{n.word.word}</strong> · {n.word.en}<br /><span lang="bn">{n.word.bn}</span>{!n.home && <><br />Group {n.word.group}</>}</> : <>synonym: {n.label}</>);
                  }}
                  onPointerLeave={() => {
                    setHover(null);
                    hide();
                  }}
                  onClick={() => pick(n)}
                >
                  {n.word && <rect className="hit" x={-n.label.length * 4.5 - 6} y={-30} width={n.label.length * 9 + 12} height={44} />}
                  {n.word ? (
                    <circle r={n.home ? 9 : 7} className={`stage-fill-${stage}`} />
                  ) : (
                    <circle r={4} className="syn-dot" />
                  )}
                  <text y={n.word ? -14 : -8} textAnchor="middle">
                    {n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        </div>
        {tip}
      </div>
      <ul className="legend">
        {STAGES.map((s) => (
          <li key={s}>
            <span className={`swatch round stage-fill-${s}`} /> {STAGE_LABEL[s]}
          </li>
        ))}
        <li>
          <span className="swatch round small-dot" /> Synonym (not on the list)
        </li>
        <li>
          <span className="swatch round ring" /> Smaller circle = word from another group
        </li>
      </ul>
    </div>
  );
}
