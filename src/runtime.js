// Minimal renderer for the design template syntax: {{path}} holes, <sc-for>, <sc-if>, onClick handlers.
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
const HOLE = /\{\{\s*([A-Za-z_$][\w$.]*)\s*\}\}/g;
const ONLY_HOLE = /^\{\{\s*([A-Za-z_$][\w$.]*)\s*\}\}$/;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function lookup(path, scope) {
  if (path === 'true') return true;
  if (path === 'false') return false;
  const parts = path.split('.');
  let v;
  for (let i = scope.length - 1; i >= 0; i--) {
    if (scope[i] && Object.prototype.hasOwnProperty.call(scope[i], parts[0])) { v = scope[i][parts[0]]; break; }
  }
  for (let j = 1; j < parts.length && v != null; j++) v = v[parts[j]];
  return v;
}
const str = (v) => (v == null ? '' : String(v));

function isStatic(node) {
  if (node.nodeType === 3) return node.nodeValue.indexOf('{{') === -1;
  if (node.nodeType !== 1) return true;
  const tag = node.tagName.toLowerCase();
  if (tag === 'sc-for' || tag === 'sc-if') return false;
  for (const a of Array.from(node.attributes)) {
    if (a.value.indexOf('{{') !== -1 || /^on/i.test(a.name)) return false;
  }
  for (const c of Array.from(node.childNodes)) if (!isStatic(c)) return false;
  return true;
}

export function createRenderer() {
  let handlers = [];
  const staticCache = new WeakMap();

  function renderNodes(nodes, scope, out) {
    for (const n of nodes) renderNode(n, scope, out);
  }

  function renderNode(node, scope, out) {
    if (node.nodeType === 3) {
      const t = node.nodeValue;
      out.push(t.indexOf('{{') === -1 ? esc(t) : esc(t.replace(HOLE, (_, p) => str(lookup(p, scope)))));
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const m = ONLY_HOLE.exec(node.getAttribute('list') || '');
      const list = m ? lookup(m[1], scope) : null;
      const as = node.getAttribute('as') || 'item';
      if (Array.isArray(list)) for (const item of list) renderNodes(node.childNodes, scope.concat([{ [as]: item }]), out);
      return;
    }
    if (tag === 'sc-if') {
      const m = ONLY_HOLE.exec(node.getAttribute('value') || '');
      if (m && lookup(m[1], scope)) renderNodes(node.childNodes, scope, out);
      return;
    }
    let cached = staticCache.get(node);
    if (cached === undefined) { cached = isStatic(node) ? node.outerHTML : null; staticCache.set(node, cached); }
    if (cached !== null) { out.push(cached); return; }

    let s = '<' + tag;
    for (const a of Array.from(node.attributes)) {
      const name = a.name;
      if (name.startsWith('hint-')) continue;
      const m = ONLY_HOLE.exec(a.value);
      if (/^on[a-z]+$/i.test(name)) {
        const fn = m ? lookup(m[1], scope) : null;
        if (typeof fn === 'function') { handlers.push(fn); s += ' data-dc-' + name.slice(2).toLowerCase() + '="' + (handlers.length - 1) + '"'; }
        continue;
      }
      const val = a.value.indexOf('{{') === -1 ? a.value : a.value.replace(HOLE, (_, p) => str(lookup(p, scope)));
      s += ' ' + name + '="' + escAttr(val) + '"';
    }
    s += '>';
    out.push(s);
    if (VOID.has(tag)) return;
    renderNodes(node.childNodes, scope, out);
    out.push('</' + tag + '>');
  }

  return {
    render(rootNodes, vals) {
      handlers = [];
      const out = [];
      renderNodes(rootNodes, [vals], out);
      return out.join('');
    },
    handler(i) { return handlers[i]; }
  };
}

export class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; this._onChange = null; }
  setState(patch) {
    const p = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = Object.assign({}, this.state, p);
    if (this._onChange) this._onChange();
  }
}
