type Store = Pick<Storage, 'getItem' | 'setItem'>;
export const recoveryPrefix = 'tabi-recovery:';

/** A failed migration must never destroy the only copy of a learning record. */
export function readPreserving<T>(
  store: Store,
  key: string,
  validate: (value: unknown) => T,
  fallback: T,
  now = Date.now(),
): { value: T; canSave: boolean; issue: string } {
  let raw: string | null;
  try {
    raw = store.getItem(key);
  } catch {
    return {
      value: fallback,
      canSave: false,
      issue: '浏览器暂不允许读取学习记录，本次更改不会覆盖原记录。',
    };
  }
  if (raw === null) return { value: fallback, canSave: true, issue: '' };
  try {
    return { value: validate(JSON.parse(raw)), canSave: true, issue: '' };
  } catch {
    try {
      const recoveryKey = recoveryPrefix + key + ':' + now;
      store.setItem(recoveryKey, raw);
      if (store.getItem(recoveryKey) !== raw)
        throw Error('Recovery copy not persisted');
      return {
        value: fallback,
        canSave: true,
        issue:
          '部分旧记录无法读取，已完整保留原始副本。可下载副本供恢复；本次使用新的记录。',
      };
    } catch {
      return {
        value: fallback,
        canSave: false,
        issue:
          '旧记录无法读取，且浏览器没有足够空间保存副本。已停止自动保存，原记录保持原样。',
      };
    }
  }
}

export function recoveryCopies(store: Storage) {
  const copies: Record<string, string> = {};
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key?.startsWith(recoveryPrefix)) copies[key] = store.getItem(key) || '';
  }
  return copies;
}

export function restorePreserving(
  store: Storage,
  data: { progress: unknown; settings: unknown },
) {
  const keys = ['tabi-progress-v1', 'tabi-settings-v1'];
  const old = keys.map((key) => store.getItem(key));
  const next = [JSON.stringify(data.progress), JSON.stringify(data.settings)];
  // Keep a recoverable checkpoint before either independent key is changed.
  const checkpoint = recoveryPrefix + 'before-import:' + Date.now();
  store.setItem(
    checkpoint,
    JSON.stringify(Object.fromEntries(keys.map((key, i) => [key, old[i]]))),
  );
  try {
    keys.forEach((key, i) => store.setItem(key, next[i]));
  } catch {
    let rolledBack = true;
    keys.forEach((key, i) => {
      try {
        if (old[i] === null) store.removeItem(key);
        else store.setItem(key, old[i]!);
      } catch {
        rolledBack = false;
      }
    });
    throw Error(
      rolledBack
        ? '浏览器未能写入备份，已恢复导入前的记录。'
        : '浏览器存储写入失败。导入前的原始记录仍保存在恢复副本中，请先下载副本。',
    );
  }
  // A completed replacement no longer needs a recovery marker.
  try {
    store.removeItem(checkpoint);
  } catch {
    /* Keep the checkpoint if removal is denied. */
  }
}
