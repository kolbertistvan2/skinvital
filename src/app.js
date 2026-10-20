import morphdom from 'morphdom';
import { createRenderer } from './runtime.js';
import Component from './component.js';
import TEMPLATE from './template.js';

const root = document.getElementById('app');
const tpl = document.createElement('template');
tpl.innerHTML = TEMPLATE;
const nodes = Array.from(tpl.content.childNodes);
const r = createRenderer();
const comp = new Component({});
let queued = false;

function paint() {
  queued = false;
  const html = r.render(nodes, comp.renderVals());
  morphdom(root, '<div id="app">' + html + '</div>', { childrenOnly: true });
}
comp._onChange = () => { if (!queued) { queued = true; queueMicrotask(paint); } };

document.addEventListener('click', (e) => {
  const el = e.target.closest && e.target.closest('[data-dc-click]');
  if (!el) return;
  const fn = r.handler(+el.getAttribute('data-dc-click'));
  if (fn) fn(e);
});

paint();
