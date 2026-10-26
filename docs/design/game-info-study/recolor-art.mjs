// Rebuilds assets/*.svg from the untouched copies in before/assets/ with the study palette.
// Native SVG colours per material (not a CSS filter): umber print ink, clear sea, distinct player plastics.
// Run: node recolor-art.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const source = new URL('./before/assets/', import.meta.url);
const target = new URL('./assets/', import.meta.url);

const MAP = {
  // Print ink, shading and highlights: warm umber instead of grey-green.
  '#33483c': '#2a211b', '#172e25': '#1b130d', '#1d3529': '#1b130d', '#203529': '#1b130d', '#20372b': '#1b130d',
  '#20392d': '#1b130d', '#22392d': '#1b130d', '#253d30': '#1b130d', '#283d34': '#1e1b18', '#fff9e9': '#fffaf0',
  // Number tokens: ivory face, crisp print red for 6/8.
  '#fff6df': '#fbf1d8', '#6d6c4e': '#4b3b2a', '#a63b2b': '#c8261c',
  // Sea, frame and harbours.
  '#d6e6e6': '#8cc8dc', '#a9c2c1': '#3f8fb0', '#e3efeb': '#eef8fb', '#527e85': '#245f7c', '#a7c6bf': '#8cc4d6',
  // Tile thickness: dark cardboard edge.
  '#9e8d63': '#6e5134', '#786e50': '#4a3624',
  // Forest.
  '#375e40': '#1f5e36', '#567d4a': '#2f7a3f', '#64854d': '#3c8a45', '#86a261': '#5ea54b', '#36573b': '#1d4a2b',
  '#806241': '#6b4426', '#7e9b68': '#57a052', '#6f8a53': '#4a8f45', '#577443': '#36703a', '#526f3e': '#2f6535',
  '#7b8860': '#5f8a4a', '#4c583e': '#2c3d26', '#526e44': '#2f6a37', '#6f8050': '#4c7f3d', '#97a36e': '#7fb35a',
  // Pasture and sheep.
  '#b7c882': '#a9d36b', '#91af69': '#84bd52', '#6f934e': '#5c9a3c', '#c3d28c': '#c2e08a', '#a3b27a': '#94c062',
  '#7f8966': '#5f7f45', '#52604a': '#3a3a36', '#b3ac73': '#a9c45e',
  // Fields.
  '#e0c276': '#f2c341', '#ebc56e': '#f5c94a', '#c29b49': '#d79a22', '#a4833c': '#b27a14', '#8b7138': '#8e5f12',
  '#e5d190': '#f7dc80', '#f3dca3': '#fbe39b', '#eed290': '#f8d86f', '#a8823d': '#b07818', '#997144': '#8d5a1e',
  // Hills / brick.
  '#c88964': '#d4703f', '#dfaa7e': '#e9935c', '#e1ae84': '#eb9a66', '#dda477': '#e68b54', '#c4815c': '#cc6638',
  '#b87754': '#bd5a30', '#b77150': '#b8552c', '#a76145': '#a14726', '#a66547': '#9e4828', '#97583f': '#8a3d22',
  '#ebbd94': '#f4b386', '#e2b185': '#eea677', '#8b513c': '#7a361f', '#784d38': '#6a311c',
  // Mountains / ore: clean slate.
  '#9ba9a0': '#96a3ae', '#aeb9ab': '#b3bec8', '#7d9187': '#75869a', '#75897f': '#6c7e91', '#586f66': '#4f6276',
  '#d9dfca': '#e6ebf0', '#edf0db': '#f4f6f8', '#94a697': '#8797a8', '#526c60': '#46586b', '#81978b': '#7a8c9e',
  '#71877f': '#67798c', '#51685f': '#46586b', '#a9b8a7': '#aab6c2', '#c0c8b4': '#c3ccd5', '#d2d9c1': '#dce2e8',
  // Desert, logs, robber.
  '#e0c89a': '#ecd3a0', '#e9cc92': '#efd296', '#f4dda3': '#f6e0a8', '#cbaa74': '#d2a868', '#aa8959': '#a8804b',
  '#95784f': '#8d6a3f', '#d6b47c': '#dfb373', '#e1c38e': '#ebc88a', '#a38351': '#9c6e3a', '#596356': '#45464d',
  // Card stock.
  '#b4a58a': '#8a7f72', '#b8a373': '#d1b07a', '#c1ad81': '#d0b68a',
  // Player plastics: crimson, cobalt, amber, teal — apart from brick, sea, wheat and forest.
  '#b9503f': '#c2232f', '#376f94': '#2867b2', '#b38b35': '#e39a14', '#557553': '#158f74',
};

const unmapped = new Set();
const files = readdirSync(source).filter(name => name.endsWith('.svg'));
for (const name of files) {
  const text = readFileSync(new URL(name, source), 'utf8');
  const out = text.replace(/#[0-9a-fA-F]{6}\b/g, hex => {
    const next = MAP[hex.toLowerCase()];
    if (!next) unmapped.add(hex.toLowerCase());
    return next ?? hex;
  });
  writeFileSync(new URL(name, target), out);
}
console.log(JSON.stringify({ files: files.length, mapped: Object.keys(MAP).length, unmapped: [...unmapped].sort() }));
