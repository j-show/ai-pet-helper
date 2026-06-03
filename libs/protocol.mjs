export const PROTOCOL_PREFIX = 'aipet://';

export const ProtocolActionType = {
  BASE: 'base',
  WAVING: 'waving',
  JUMPING: 'jumping',
  FAILED: 'failed',
  WAITING: 'waiting',
  RUNNING: 'running',
  REVIEW: 'review'
};

export const buildTextProtocolUrl = (options = {}) => {
  const stp = (options.stp || '').trim();
  const sid = (options.sid || '').trim();
  const tl = (options.title || '').trim();
  const icon = (options.icon || '').trim();
  const txt = (options.text || '').trim();

  const params = new URLSearchParams();

  if (stp) params.set('stp', stp);
  if (sid) params.set('sid', sid);
  if (tl) params.set('tl', tl);
  if (icon) params.set('icon', icon);
  if (txt) params.set('txt', txt);

  if (!params.has('txt')) {
    params.delete('icon');
    params.delete('tl');
  }

  return `${PROTOCOL_PREFIX}text?${params.toString()}`;
};

export const buildActionProtocolUrl = (
  type = ProtocolActionType.BASE,
  options = {}
) => {
  if (type === ProtocolActionType.BASE) return `${PROTOCOL_PREFIX}base`;

  const loop = options.loop || true;
  const count = options.count || 0;
  const def = options.default || false;

  const params = new URLSearchParams();

  if (loop) params.set('loop', loop);
  if (count) params.set('count', count);
  if (def) params.set('default', def);

  if (def) {
    params.delete('loop');
    params.delete('count');
  } else if (count > 0) {
    params.delete('loop');
  }

  return `${PROTOCOL_PREFIX}${type}?${params.toString()}`;
};
