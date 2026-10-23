/** One request at a time; disposal also ignores any response already in flight. */
export function pollTask<T>({request, receive, visibility = document}: {
  request: () => Promise<T>;
  receive: (result: T) => boolean; // true when the task is finished
  visibility?: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;
}) {
  let disposed = false, finished = false, inFlight = false, errors = 0;
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => { clearTimeout(timer); timer = undefined; };
  const delay = () => errors ? Math.min(60000, 3000 * 2 ** Math.min(errors, 5)) :
    Date.now() - startedAt >= 300000 ? 30000 : Date.now() - startedAt >= 60000 ? 10000 : 3000;
  const schedule = (ms: number) => {
    clear();
    if (!disposed && !finished && !visibility.hidden && !inFlight) timer = setTimeout(run, ms);
  };
  async function run() {
    if (disposed || finished || visibility.hidden || inFlight) return;
    inFlight = true;
    try {
      const result = await request();
      if (!disposed) { finished = receive(result); errors = 0; }
    } catch { errors++; }
    finally { inFlight = false; schedule(delay()); }
  }
  const onVisibility = () => { if (visibility.hidden) clear(); else schedule(0); };
  visibility.addEventListener('visibilitychange', onVisibility);
  schedule(3000);
  return () => { disposed = true; clear(); visibility.removeEventListener('visibilitychange', onVisibility); };
}

export function taskStatusData(result: any) {
  if (result.isError) throw new Error('Task status unavailable');
  const data = result.structuredContent ?? JSON.parse(result.content?.find((b: any) => b.type === 'text')?.text ?? 'null');
  if (!data?.task) throw new Error('Task status missing');
  return data;
}
