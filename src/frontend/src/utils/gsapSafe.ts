import { useEffect } from 'react';

// Minimal no-op GSAP-compatible facade to avoid build/runtime errors
// when the real GSAP packages are not installed. When you install
// `gsap` and `@gsap/react`, you can switch imports to the real ones
// or keep this as a fallback if desired.

class TimelineStub {
  set(_: any, __?: any) { return this; }
  to(_: any, __?: any) { return this; }
  from(_: any, __?: any) { return this; }
  fromTo(_: any, __?: any, ___?: any) { return this; }
  add(_: any) { return this; }
  clear() { return this; }
  kill() { return this; }
}

type AnyFn = (...args: any[]) => any;

const noop: AnyFn = () => {};

export const gsap: any = {
  core: { Timeline: TimelineStub },
  registerPlugin: noop,
  timeline: (_?: any) => new TimelineStub(),
  to: noop,
  from: noop,
  fromTo: noop,
  set: noop,
};

export const ScrollTrigger: any = {
  create: (_?: any) => ({ kill: noop }),
  batch: (_selector: any, _config: any) => {},
};

export const TextPlugin: any = {};

// Lightweight replacement for `@gsap/react`'s useGSAP hook.
// Executes the provided callback once after mount.
export const useGSAP = (cb: AnyFn, _deps?: any) => {
  useEffect(() => {
    try { cb(); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default gsap;

