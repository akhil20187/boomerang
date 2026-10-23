import {afterEach, describe, expect, it, vi} from 'vitest';
import {pollTask, taskStatusData} from '../web/src/taskPolling';
afterEach(()=>vi.useRealTimers());
function fixture() {
  vi.useFakeTimers();
  const visibility = Object.assign(new EventTarget(), {hidden:false});
  const request = vi.fn(async()=>({task:{_id:'a',status:'running'}}));
  const receive = vi.fn((data:Awaited<ReturnType<typeof request>>)=>data.task.status==='finished');
  return {visibility,request,receive};
}
describe('widget task polling lifecycle',()=>{
  it('stops permanently after completion',async()=>{
    const f=fixture();f.request.mockResolvedValue({task:{_id:'a',status:'finished'}});
    const stop=pollTask(f);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(60000);
    f.visibility.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(60000);
    expect(f.request).toHaveBeenCalledTimes(1);stop();
  });
  it('disposes on unmount and ignores an old task response after switching tasks',async()=>{
    const f=fixture();let resolve!: (value:any)=>void;
    f.request.mockImplementation(()=>new Promise(r=>{resolve=r}));
    const stop=pollTask(f);await vi.advanceTimersByTimeAsync(3000);stop();
    const next=fixture();const stopNext=pollTask(next);
    resolve({task:{_id:'old',status:'finished'}});
    await vi.advanceTimersByTimeAsync(3000);
    expect(f.receive).not.toHaveBeenCalled();expect(next.request).toHaveBeenCalledTimes(1);
    stopNext();await vi.advanceTimersByTimeAsync(60000);
    expect(next.request).toHaveBeenCalledTimes(1);
  });
  it('pauses while hidden and refreshes immediately when visible without overlap',async()=>{
    const f=fixture();f.visibility.hidden=true;
    const stop=pollTask(f);await vi.advanceTimersByTimeAsync(60000);
    expect(f.request).not.toHaveBeenCalled();
    let resolve!:(value:any)=>void;f.request.mockImplementation(()=>new Promise(r=>{resolve=r}));
    f.visibility.hidden=false;f.visibility.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    f.visibility.hidden=true;f.visibility.dispatchEvent(new Event('visibilitychange'));
    f.visibility.hidden=false;f.visibility.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(60000);expect(f.request).toHaveBeenCalledTimes(1);
    resolve({task:{_id:'a',status:'running'}});await vi.advanceTimersByTimeAsync(10000);
    expect(f.request).toHaveBeenCalledTimes(2);stop();
  });
  it('backs off transient transport and tool errors then recovers',async()=>{
    const f=fixture();f.request.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({isError:true} as any);
    const receive=vi.fn(result=>{const data=taskStatusData(result.isError ? result : {structuredContent:result});return data.task.status==='finished'});
    const stop=pollTask({...f,receive});
    await vi.advanceTimersByTimeAsync(3000);expect(f.request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5999);expect(f.request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);expect(f.request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(12000);expect(f.request).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(3000);expect(f.request).toHaveBeenCalledTimes(4);stop();
  });
  it('reduces long-running polling to 30 seconds',async()=>{
    const f=fixture();const stop=pollTask(f);
    await vi.advanceTimersByTimeAsync(300000);f.request.mockClear();
    await vi.advanceTimersByTimeAsync(60000);expect(f.request).toHaveBeenCalledTimes(2);stop();
  });
  it('accepts text tool results and rejects missing task data',()=>{
    expect(taskStatusData({content:[{type:'text',text:'{"task":{"status":"finished"}}'}]}).task.status).toBe('finished');
    expect(()=>taskStatusData({structuredContent:{error:'unavailable'}})).toThrow();
  });
});
